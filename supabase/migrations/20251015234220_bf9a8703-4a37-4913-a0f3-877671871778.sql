-- ============================================
-- CORREÇÃO DEFINITIVA DA ESTRUTURA DE MANUTENÇÕES
-- ============================================

-- 1) Corrigir codigo_unico duplicados
UPDATE lotes
SET codigo_unico = codigo
WHERE deleted_at IS NULL
  AND codigo_unico != codigo;

-- 2) Limpar dados incorretos
DELETE FROM lotes_manutencoes;
DELETE FROM manutencoes_semanais;

-- 3) Criar registros ÚNICOS de manutenção por (lote, etapa)
-- Fonte primária: lote_eventos
WITH eventos_unicos AS (
  SELECT DISTINCT ON (le.lote_id, le.etapa_numero)
    le.id AS evento_id,
    le.lote_id,
    le.etapa_numero,
    le.data_evento,
    le.peso_antes,
    le.peso_depois,
    le.caixa_origem,
    le.caixa_destino,
    le.fotos_compartilhadas,
    le.administrador_id,
    le.administrador_nome,
    le.observacoes,
    le.latitude,
    le.longitude,
    le.sessao_manutencao_id,
    -- Dados da sessão como fallback
    sm.fotos_gerais AS sessao_fotos,
    sm.observacoes_gerais AS sessao_obs
  FROM lote_eventos le
  LEFT JOIN sessoes_manutencao sm ON le.sessao_manutencao_id = sm.id
  WHERE le.deleted_at IS NULL
    AND le.tipo_evento IN ('manutencao', 'finalizacao')
    AND le.etapa_numero BETWEEN 2 AND 8
  ORDER BY le.lote_id, le.etapa_numero, le.data_evento DESC NULLS LAST
),
-- 4) Inserir em manutencoes_semanais (1 registro por evento único)
insert_manutencoes AS (
  INSERT INTO manutencoes_semanais (
    id,
    data_ocorrencia,
    comentario,
    fotos_urls,
    validador_id,
    validador_nome,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  SELECT
    eu.evento_id,
    eu.data_evento,
    COALESCE(eu.observacoes, eu.sessao_obs, 'Manutenção semanal'),
    -- Prioriza fotos do evento, fallback para sessão
    CASE
      WHEN eu.fotos_compartilhadas IS NOT NULL AND jsonb_array_length(eu.fotos_compartilhadas) > 0
        THEN ARRAY(SELECT jsonb_array_elements_text(eu.fotos_compartilhadas))
      WHEN eu.sessao_fotos IS NOT NULL AND jsonb_array_length(eu.sessao_fotos) > 0
        THEN ARRAY(SELECT jsonb_array_elements_text(eu.sessao_fotos))
      ELSE '{}'::text[]
    END,
    eu.administrador_id,
    COALESCE(eu.administrador_nome, 'Sistema'),
    eu.latitude,
    eu.longitude,
    eu.data_evento,
    eu.data_evento
  FROM eventos_unicos eu
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
-- 5) Criar associações em lotes_manutencoes
INSERT INTO lotes_manutencoes (
  lote_id,
  manutencao_id,
  semana_processo,
  peso_antes,
  peso_depois,
  caixa_origem,
  caixa_destino,
  created_at
)
SELECT
  eu.lote_id,
  eu.evento_id,
  (eu.etapa_numero - 1) AS semana_processo,
  COALESCE(eu.peso_antes, 0),
  COALESCE(eu.peso_depois, 0),
  COALESCE(eu.caixa_origem, GREATEST(1, eu.etapa_numero - 1)),
  COALESCE(eu.caixa_destino, LEAST(7, eu.etapa_numero)),
  eu.data_evento
FROM eventos_unicos eu
ON CONFLICT (lote_id, semana_processo) DO UPDATE
SET manutencao_id = EXCLUDED.manutencao_id,
    created_at = EXCLUDED.created_at;