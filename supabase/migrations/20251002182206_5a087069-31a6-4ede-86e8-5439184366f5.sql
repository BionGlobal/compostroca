-- =====================================================
-- MIGRATION: Refatoração da Associação de Manutenções (v2)
-- Data: 2025-10-02
-- Objetivo: Criar associação direta entre manutenções e lotes
-- =====================================================

-- 1. Garantir FK em sessao_manutencao_id
ALTER TABLE lote_eventos
DROP CONSTRAINT IF EXISTS lote_eventos_sessao_manutencao_fkey;

ALTER TABLE lote_eventos
ADD CONSTRAINT lote_eventos_sessao_manutencao_fkey
FOREIGN KEY (sessao_manutencao_id)
REFERENCES sessoes_manutencao(id)
ON DELETE SET NULL;

-- 2. Criar índices para otimizar as consultas
CREATE INDEX IF NOT EXISTS idx_lote_eventos_sessao_manutencao 
ON lote_eventos(sessao_manutencao_id) 
WHERE sessao_manutencao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessoes_manutencao_data 
ON sessoes_manutencao(data_sessao);

CREATE INDEX IF NOT EXISTS idx_lote_eventos_tipo_data 
ON lote_eventos(tipo_evento, data_evento);

-- 3. Adicionar campos úteis em lote_eventos
ALTER TABLE lote_eventos
ADD COLUMN IF NOT EXISTS peso_medido numeric,
ADD COLUMN IF NOT EXISTS peso_estimado numeric;

COMMENT ON COLUMN lote_eventos.peso_medido IS 'Peso real medido durante o evento';
COMMENT ON COLUMN lote_eventos.peso_estimado IS 'Peso estimado calculado automaticamente';
COMMENT ON COLUMN lote_eventos.sessao_manutencao_id IS 'FK para sessao de manutencao compartilhada entre todos os lotes ativos';

-- 4. Criar função para buscar lotes ativos em uma data
CREATE OR REPLACE FUNCTION get_lotes_ativos_na_data(data_ref timestamp with time zone)
RETURNS TABLE(lote_id uuid, codigo text, caixa_atual integer, peso_atual numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as lote_id,
    codigo,
    caixa_atual,
    peso_atual
  FROM lotes
  WHERE status IN ('ativo', 'em_processamento')
    AND data_inicio <= data_ref
    AND (data_encerramento IS NULL OR data_encerramento >= data_ref)
    AND deleted_at IS NULL
  ORDER BY caixa_atual;
$$;

-- 5. Criar função para associar sessão aos lotes ativos (respeitando constraint etapa_numero <= 8)
CREATE OR REPLACE FUNCTION associar_sessao_aos_lotes_ativos(
  p_sessao_id uuid,
  p_data_sessao timestamp with time zone DEFAULT now()
)
RETURNS TABLE(lote_id uuid, evento_id uuid, sucesso boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote RECORD;
  v_evento_id uuid;
  v_count integer := 0;
  v_proxima_etapa integer;
BEGIN
  FOR v_lote IN 
    SELECT * FROM get_lotes_ativos_na_data(p_data_sessao)
  LOOP
    -- Calcular próxima etapa (máximo 8)
    SELECT COALESCE(MAX(etapa_numero), 1) + 1 INTO v_proxima_etapa
    FROM lote_eventos
    WHERE lote_eventos.lote_id = v_lote.lote_id;
    
    -- Só criar evento se não ultrapassar etapa 8
    IF v_proxima_etapa <= 8 THEN
      INSERT INTO lote_eventos (
        lote_id,
        tipo_evento,
        etapa_numero,
        data_evento,
        sessao_manutencao_id,
        peso_antes,
        peso_depois,
        caixa_origem,
        caixa_destino,
        administrador_nome
      )
      SELECT
        v_lote.lote_id,
        'manutencao',
        v_proxima_etapa,
        p_data_sessao,
        p_sessao_id,
        v_lote.peso_atual,
        v_lote.peso_atual,
        v_lote.caixa_atual,
        v_lote.caixa_atual,
        sm.administrador_nome
      FROM sessoes_manutencao sm
      WHERE sm.id = p_sessao_id
      RETURNING id INTO v_evento_id;
      
      v_count := v_count + 1;
      RETURN QUERY SELECT v_lote.lote_id, v_evento_id, true;
    ELSE
      RAISE NOTICE 'Lote % já atingiu etapa máxima (8)', v_lote.codigo;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Sessão % associada a % lotes ativos', p_sessao_id, v_count;
END;
$$;