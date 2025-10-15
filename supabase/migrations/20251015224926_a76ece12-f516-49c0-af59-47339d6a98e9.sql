-- ========================================
-- FASE 1: CRIAÇÃO DAS NOVAS TABELAS
-- ========================================

-- Tabela de manutenções semanais (dados do evento)
CREATE TABLE manutencoes_semanais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_ocorrencia TIMESTAMPTZ NOT NULL,
  comentario TEXT,
  fotos_urls TEXT[] NOT NULL DEFAULT '{}',
  validador_id UUID REFERENCES auth.users(id),
  validador_nome TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para otimização
CREATE INDEX idx_manutencoes_semanais_data ON manutencoes_semanais(data_ocorrencia);
CREATE INDEX idx_manutencoes_semanais_validador ON manutencoes_semanais(validador_id);
CREATE INDEX idx_manutencoes_semanais_deleted ON manutencoes_semanais(deleted_at) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_manutencoes_semanais_updated_at
  BEFORE UPDATE ON manutencoes_semanais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de associação lote-manutenção
CREATE TABLE lotes_manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  manutencao_id UUID NOT NULL REFERENCES manutencoes_semanais(id) ON DELETE CASCADE,
  semana_processo INTEGER NOT NULL CHECK (semana_processo BETWEEN 1 AND 7),
  peso_antes NUMERIC NOT NULL,
  peso_depois NUMERIC NOT NULL,
  caixa_origem INTEGER NOT NULL CHECK (caixa_origem BETWEEN 1 AND 7),
  caixa_destino INTEGER NOT NULL CHECK (caixa_destino BETWEEN 1 AND 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(lote_id, semana_processo)
);

-- Índices para otimização
CREATE INDEX idx_lotes_manutencoes_lote ON lotes_manutencoes(lote_id);
CREATE INDEX idx_lotes_manutencoes_manutencao ON lotes_manutencoes(manutencao_id);
CREATE INDEX idx_lotes_manutencoes_semana ON lotes_manutencoes(semana_processo);
CREATE INDEX idx_lotes_manutencoes_deleted ON lotes_manutencoes(deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- POLÍTICAS RLS
-- ========================================

ALTER TABLE manutencoes_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view manutencoes semanais"
  ON manutencoes_semanais FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Approved local/super admins can insert manutencoes"
  ON manutencoes_semanais FOR INSERT
  TO authenticated
  WITH CHECK (can_modify_data());

CREATE POLICY "Approved local/super admins can update manutencoes"
  ON manutencoes_semanais FOR UPDATE
  TO authenticated
  USING (can_modify_data());

CREATE POLICY "Approved local/super admins can delete manutencoes"
  ON manutencoes_semanais FOR DELETE
  TO authenticated
  USING (can_modify_data());

ALTER TABLE lotes_manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lotes manutencoes"
  ON lotes_manutencoes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Approved local/super admins can insert lotes manutencoes"
  ON lotes_manutencoes FOR INSERT
  TO authenticated
  WITH CHECK (
    can_modify_data() 
    AND EXISTS (
      SELECT 1 FROM lotes l 
      WHERE l.id = lote_id 
      AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Approved local/super admins can update lotes manutencoes"
  ON lotes_manutencoes FOR UPDATE
  TO authenticated
  USING (
    can_modify_data() 
    AND EXISTS (
      SELECT 1 FROM lotes l 
      WHERE l.id = lote_id 
      AND has_unit_access(l.unidade)
    )
  );

CREATE POLICY "Approved local/super admins can delete lotes manutencoes"
  ON lotes_manutencoes FOR DELETE
  TO authenticated
  USING (
    can_modify_data() 
    AND EXISTS (
      SELECT 1 FROM lotes l 
      WHERE l.id = lote_id 
      AND has_unit_access(l.unidade)
    )
  );

-- ========================================
-- FASE 2: MIGRAÇÃO DE DADOS HISTÓRICOS
-- ========================================

DO $$
DECLARE
  evento_record RECORD;
  manutencao_id_novo UUID;
  eventos_migrados INTEGER := 0;
  eventos_pulados INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando migração de eventos de manutenção...';
  
  FOR evento_record IN 
    SELECT 
      le.id as evento_id,
      le.lote_id,
      le.tipo_evento,
      le.etapa_numero,
      le.data_evento,
      le.sessao_manutencao_id,
      le.peso_antes,
      le.peso_depois,
      le.caixa_origem,
      le.caixa_destino,
      le.administrador_id,
      le.administrador_nome,
      le.observacoes,
      le.fotos_compartilhadas,
      le.latitude,
      le.longitude,
      sm.fotos_gerais as sessao_fotos,
      sm.observacoes_gerais as sessao_obs,
      sm.administrador_nome as sessao_validador
    FROM lote_eventos le
    LEFT JOIN sessoes_manutencao sm ON le.sessao_manutencao_id = sm.id
    WHERE le.tipo_evento IN ('manutencao', 'finalizacao')
      AND le.deleted_at IS NULL
      AND le.etapa_numero BETWEEN 2 AND 8
    ORDER BY le.data_evento, le.etapa_numero
  LOOP
    IF EXISTS (
      SELECT 1 FROM lotes_manutencoes 
      WHERE lote_id = evento_record.lote_id 
      AND semana_processo = (evento_record.etapa_numero - 1)
    ) THEN
      eventos_pulados := eventos_pulados + 1;
      CONTINUE;
    END IF;
    
    DECLARE
      fotos_array TEXT[];
      comentario_final TEXT;
      validador_final TEXT;
    BEGIN
      IF evento_record.fotos_compartilhadas IS NOT NULL 
         AND jsonb_array_length(evento_record.fotos_compartilhadas) > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(evento_record.fotos_compartilhadas)) 
        INTO fotos_array;
      ELSIF evento_record.sessao_fotos IS NOT NULL 
            AND jsonb_array_length(evento_record.sessao_fotos) > 0 THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(evento_record.sessao_fotos)) 
        INTO fotos_array;
      ELSE
        fotos_array := '{}';
      END IF;
      
      comentario_final := COALESCE(
        evento_record.sessao_obs,
        evento_record.observacoes,
        ''
      );
      
      validador_final := COALESCE(
        evento_record.sessao_validador,
        evento_record.administrador_nome,
        'Sistema'
      );
      
      INSERT INTO manutencoes_semanais (
        data_ocorrencia,
        comentario,
        fotos_urls,
        validador_id,
        validador_nome,
        latitude,
        longitude
      ) VALUES (
        evento_record.data_evento,
        comentario_final,
        fotos_array,
        evento_record.administrador_id,
        validador_final,
        evento_record.latitude,
        evento_record.longitude
      )
      RETURNING id INTO manutencao_id_novo;
      
      INSERT INTO lotes_manutencoes (
        lote_id,
        manutencao_id,
        semana_processo,
        peso_antes,
        peso_depois,
        caixa_origem,
        caixa_destino
      ) VALUES (
        evento_record.lote_id,
        manutencao_id_novo,
        evento_record.etapa_numero - 1,
        COALESCE(evento_record.peso_antes, 0),
        COALESCE(evento_record.peso_depois, 0),
        COALESCE(evento_record.caixa_origem, 1),
        COALESCE(evento_record.caixa_destino, 2)
      );
      
      eventos_migrados := eventos_migrados + 1;
      
      IF eventos_migrados % 10 = 0 THEN
        RAISE NOTICE '   Migrados: % eventos', eventos_migrados;
      END IF;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migração concluída!';
  RAISE NOTICE '   Total migrados: %', eventos_migrados;
  RAISE NOTICE '   Total pulados (duplicados): %', eventos_pulados;
  
END $$;