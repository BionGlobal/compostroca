-- Reconstrução completa dos dados de manutenção a partir de lote_eventos (fonte da verdade)

-- Fase 1: Limpar dados incorretos/duplicados
TRUNCATE TABLE lotes_manutencoes CASCADE;
TRUNCATE TABLE manutencoes_semanais CASCADE;

-- Fase 2: Recriar registros únicos em manutencoes_semanais a partir de lote_eventos
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
  le.id,
  le.data_evento,
  COALESCE(le.observacoes, 'Manutenção semanal'),
  CASE 
    WHEN le.fotos_compartilhadas IS NOT NULL 
      AND jsonb_array_length(le.fotos_compartilhadas) > 0
    THEN ARRAY(SELECT jsonb_array_elements_text(le.fotos_compartilhadas))
    ELSE '{}'::text[]
  END,
  le.administrador_id,
  COALESCE(le.administrador_nome, 'Sistema'),
  le.latitude,
  le.longitude,
  le.data_evento,
  le.data_evento
FROM lote_eventos le
WHERE le.tipo_evento IN ('manutencao', 'finalizacao')
  AND le.deleted_at IS NULL
  AND le.etapa_numero BETWEEN 2 AND 8
ON CONFLICT (id) DO NOTHING;

-- Fase 3: Criar associações únicas em lotes_manutencoes
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
  le.lote_id,
  le.id,
  (le.etapa_numero - 1),
  COALESCE(le.peso_antes, 0),
  COALESCE(le.peso_depois, 0),
  COALESCE(le.caixa_origem, le.etapa_numero - 1),
  -- Limitar caixa_destino a 7 (valor máximo válido)
  LEAST(COALESCE(le.caixa_destino, le.etapa_numero), 7),
  le.data_evento
FROM lote_eventos le
WHERE le.tipo_evento IN ('manutencao', 'finalizacao')
  AND le.deleted_at IS NULL
  AND le.etapa_numero BETWEEN 2 AND 8;