-- Corrigir eventos de início dos lotes com dados de entregas reais (3 casas decimais)
-- Esta migração atualiza lote_eventos onde tipo_evento = 'inicio' e dados_especificos está zerado/nulo

UPDATE lote_eventos le
SET 
  peso_depois = l.peso_inicial,
  dados_especificos = jsonb_build_object(
    'peso_residuos', ROUND(COALESCE(entregas_data.peso_total, 0)::numeric, 3),
    'peso_cepilho', ROUND((COALESCE(entregas_data.peso_total, 0) * 0.35)::numeric, 3),
    'total_voluntarios', COALESCE(entregas_data.total_voluntarios, 0),
    'entregas', COALESCE(entregas_data.entregas_array, '[]'::jsonb)
  ),
  fotos_compartilhadas = COALESCE(fotos_data.fotos_array, '[]'::jsonb),
  updated_at = now()
FROM lotes l
LEFT JOIN LATERAL (
  SELECT 
    ROUND(SUM(e.peso)::numeric, 3) as peso_total,
    COUNT(DISTINCT e.voluntario_id) as total_voluntarios,
    jsonb_agg(jsonb_build_object(
      'voluntario_id', e.voluntario_id,
      'peso', ROUND(e.peso::numeric, 3),
      'qualidade', e.qualidade_residuo,
      'data', e.created_at
    )) as entregas_array
  FROM entregas e
  WHERE e.lote_codigo = l.codigo
    AND e.deleted_at IS NULL
) entregas_data ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(DISTINCT ef.foto_url) as fotos_array
  FROM entregas e
  JOIN entrega_fotos ef ON ef.entrega_id = e.id
  WHERE e.lote_codigo = l.codigo
    AND e.deleted_at IS NULL
    AND ef.deleted_at IS NULL
) fotos_data ON true
WHERE le.lote_id = l.id
  AND le.tipo_evento = 'inicio'
  AND le.deleted_at IS NULL
  AND (
    (le.dados_especificos->>'total_voluntarios')::int IS NULL
    OR (le.dados_especificos->>'total_voluntarios')::int = 0
    OR le.dados_especificos->>'peso_residuos' IS NULL
    OR (le.dados_especificos->>'peso_residuos')::numeric = 0
  );