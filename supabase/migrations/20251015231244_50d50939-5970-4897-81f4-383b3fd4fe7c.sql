-- CORREÇÃO DEFINITIVA DA TRILHA DE AUDITORIA
-- Limpa dados incorretos e reconstrói a partir das fontes corretas

-- 1) Limpeza segura (ordem respeitando FKs)
DELETE FROM lotes_manutencoes;
DELETE FROM manutencoes_semanais;

-- 2) Repovoar manutencoes_semanais a partir de sessoes_manutencao (mapa de colunas correto)
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
  sm.id,
  sm.data_sessao,
  sm.observacoes_gerais,
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(sm.fotos_gerais)), '{}'),
  sm.administrador_id,
  sm.administrador_nome,
  sm.latitude,
  sm.longitude,
  sm.created_at,
  sm.updated_at
FROM sessoes_manutencao sm
WHERE sm.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3) Associar lotes às manutenções (1 registro por semana)
WITH eventos_filtrados AS (
  SELECT DISTINCT ON (le.lote_id, le.etapa_numero)
    le.lote_id,
    le.sessao_manutencao_id,
    le.etapa_numero,
    le.data_evento,
    le.peso_antes,
    le.peso_depois,
    le.caixa_origem,
    le.caixa_destino
  FROM lote_eventos le
  WHERE le.deleted_at IS NULL
    AND le.tipo_evento IN ('manutencao', 'finalizacao')
    AND le.etapa_numero BETWEEN 2 AND 8
    AND le.lote_id IS NOT NULL
  ORDER BY le.lote_id, le.etapa_numero, le.data_evento DESC NULLS LAST
)
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
  ef.lote_id,
  ef.sessao_manutencao_id,
  (ef.etapa_numero - 1) AS semana_processo,
  COALESCE(ef.peso_antes, 0),
  COALESCE(ef.peso_depois, 0),
  COALESCE(ef.caixa_origem, GREATEST(1, ef.etapa_numero - 1)),
  COALESCE(ef.caixa_destino, LEAST(7, ef.etapa_numero)),
  COALESCE(ef.data_evento, now())
FROM eventos_filtrados ef
WHERE ef.sessao_manutencao_id IS NOT NULL
ON CONFLICT (lote_id, semana_processo) DO UPDATE
SET manutencao_id = EXCLUDED.manutencao_id,
    peso_antes    = EXCLUDED.peso_antes,
    peso_depois   = EXCLUDED.peso_depois,
    caixa_origem  = EXCLUDED.caixa_origem,
    caixa_destino = EXCLUDED.caixa_destino,
    created_at    = EXCLUDED.created_at;

-- 3b) OPCIONAL: eventos sem sessão — cria uma manutenção "ad-hoc"
WITH eventos_sem_sessao AS (
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
    le.latitude,
    le.longitude
  FROM lote_eventos le
  WHERE le.deleted_at IS NULL
    AND le.tipo_evento IN ('manutencao', 'finalizacao')
    AND le.etapa_numero BETWEEN 2 AND 8
    AND le.sessao_manutencao_id IS NULL
  ORDER BY le.lote_id, le.etapa_numero, le.data_evento DESC NULLS LAST
),
inserted_manutencoes AS (
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
    es.evento_id,
    es.data_evento,
    'Registro criado a partir de lote_eventos (sem sessão associada)',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(es.fotos_compartilhadas)), '{}'),
    es.administrador_id,
    COALESCE(es.administrador_nome, 'Sistema'),
    es.latitude,
    es.longitude,
    COALESCE(es.data_evento, now()),
    COALESCE(es.data_evento, now())
  FROM eventos_sem_sessao es
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
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
  es.lote_id,
  es.evento_id,
  (es.etapa_numero - 1),
  COALESCE(es.peso_antes, 0),
  COALESCE(es.peso_depois, 0),
  COALESCE(es.caixa_origem, GREATEST(1, es.etapa_numero - 1)),
  COALESCE(es.caixa_destino, LEAST(7, es.etapa_numero)),
  COALESCE(es.data_evento, now())
FROM eventos_sem_sessao es
ON CONFLICT (lote_id, semana_processo) DO UPDATE
SET manutencao_id = EXCLUDED.manutencao_id,
    peso_antes    = EXCLUDED.peso_antes,
    peso_depois   = EXCLUDED.peso_depois,
    caixa_origem  = EXCLUDED.caixa_origem,
    caixa_destino = EXCLUDED.caixa_destino,
    created_at    = EXCLUDED.created_at;