-- ============================================
-- CORREÇÃO COMPLETA: ETAPAS E FOTOS DOS LOTES
-- ============================================

-- 1️⃣ CRIAR ETAPA 1 (INICIO) PARA LOTES SEM EVENTO DE INÍCIO
INSERT INTO lote_eventos (
  lote_id,
  tipo_evento,
  etapa_numero,
  data_evento,
  peso_antes,
  peso_depois,
  caixa_origem,
  caixa_destino,
  latitude,
  longitude,
  administrador_id,
  administrador_nome,
  observacoes,
  fotos_compartilhadas,
  dados_especificos
)
SELECT 
  l.id,
  'inicio',
  1,
  l.data_inicio,
  0,
  l.peso_inicial,
  1, 1,
  l.latitude,
  l.longitude,
  l.criado_por,
  l.criado_por_nome,
  'Início do lote - Material orgânico depositado na Caixa 1',
  -- Buscar fotos das entregas
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT ef.foto_url)
      FROM entregas e
      JOIN entrega_fotos ef ON e.id = ef.entrega_id
      WHERE e.lote_codigo = l.codigo
        AND e.deleted_at IS NULL
        AND ef.deleted_at IS NULL
    ),
    '[]'::jsonb
  ),
  -- Dados específicos com informações das entregas
  jsonb_build_object(
    'peso_residuos', (
      SELECT COALESCE(SUM(peso), 0)
      FROM entregas 
      WHERE lote_codigo = l.codigo AND deleted_at IS NULL
    ),
    'peso_cepilho', l.peso_inicial * 0.35 / 1.35,
    'total_voluntarios', (
      SELECT COUNT(DISTINCT voluntario_id)
      FROM entregas 
      WHERE lote_codigo = l.codigo AND deleted_at IS NULL
    ),
    'fonte', 'recuperacao_retroativa'
  )
FROM lotes l
WHERE l.unidade = 'CWB001'
  AND l.status = 'em_processamento'
  AND l.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lote_eventos le
    WHERE le.lote_id = l.id 
      AND le.etapa_numero = 1 
      AND le.deleted_at IS NULL
  );

-- 2️⃣ ASSOCIAR FOTOS REAIS ÀS SESSÕES DE MANUTENÇÃO VAZIAS
UPDATE sessoes_manutencao sm
SET fotos_gerais = (
  SELECT jsonb_agg(DISTINCT lf.foto_url ORDER BY lf.foto_url)
  FROM lote_fotos lf
  WHERE lf.tipo_foto = 'manejo_semanal'
    AND lf.deleted_at IS NULL
    AND lf.created_at >= sm.data_sessao - INTERVAL '3 days'
    AND lf.created_at <= sm.data_sessao + INTERVAL '3 days'
)
WHERE sm.unidade_codigo = 'CWB001'
  AND (sm.fotos_gerais IS NULL OR sm.fotos_gerais = '[]'::jsonb)
  AND sm.data_sessao >= '2025-09-01'
  AND sm.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM lote_fotos lf
    WHERE lf.tipo_foto = 'manejo_semanal'
      AND lf.deleted_at IS NULL
      AND lf.created_at >= sm.data_sessao - INTERVAL '3 days'
      AND lf.created_at <= sm.data_sessao + INTERVAL '3 days'
  );

-- 3️⃣ GARANTIR ORDEM CORRETA DAS ETAPAS (Etapa 1 sempre primeiro)
UPDATE lote_eventos
SET data_evento = (
  SELECT l.data_inicio
  FROM lotes l
  WHERE l.id = lote_eventos.lote_id
)
WHERE etapa_numero = 1
  AND tipo_evento = 'inicio'
  AND data_evento > (
    SELECT MIN(le2.data_evento)
    FROM lote_eventos le2
    WHERE le2.lote_id = lote_eventos.lote_id
      AND le2.etapa_numero > 1
  );

-- 4️⃣ VERIFICAÇÃO FINAL: Contar eventos criados
SELECT 
  'Etapas 1 criadas' as verificacao,
  COUNT(*) as total
FROM lote_eventos
WHERE tipo_evento = 'inicio' 
  AND etapa_numero = 1
  AND dados_especificos->>'fonte' = 'recuperacao_retroativa';

SELECT 
  'Sessões com fotos atualizadas' as verificacao,
  COUNT(*) as total
FROM sessoes_manutencao
WHERE unidade_codigo = 'CWB001'
  AND fotos_gerais IS NOT NULL
  AND fotos_gerais != '[]'::jsonb
  AND data_sessao >= '2025-09-01';