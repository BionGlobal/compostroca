-- =============================================
-- FASE 1: Corrigir dados históricos de CO2e
-- =============================================
UPDATE lotes 
SET 
  co2eq_evitado = peso_inicial * 0.766,
  creditos_cau = peso_inicial / 1000.0,
  updated_at = now()
WHERE status = 'encerrado' 
  AND deleted_at IS NULL 
  AND (co2eq_evitado IS NULL OR co2eq_evitado = 0);

-- =============================================
-- FASE 2: Criar função get_impact_metrics
-- =============================================
CREATE OR REPLACE FUNCTION public.get_impact_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    -- Métricas de Lotes Finalizados
    'lotes_finalizados', (
      SELECT COUNT(*) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'peso_inicial_finalizados_kg', (
      SELECT COALESCE(SUM(peso_inicial), 0) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'peso_inicial_finalizados_ton', (
      SELECT ROUND(COALESCE(SUM(peso_inicial), 0) / 1000, 4) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'co2e_evitado_kg', (
      SELECT ROUND(COALESCE(SUM(peso_inicial * 0.766), 0), 2) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'co2e_evitado_ton', (
      SELECT ROUND(COALESCE(SUM(peso_inicial * 0.766), 0) / 1000, 4) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'composto_produzido_kg', (
      SELECT COALESCE(SUM(COALESCE(peso_final, peso_atual)), 0) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'composto_produzido_ton', (
      SELECT ROUND(COALESCE(SUM(COALESCE(peso_final, peso_atual)), 0) / 1000, 4) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    
    -- Métricas de Lotes Ativos
    'lotes_em_processamento', (
      SELECT COUNT(*) FROM lotes 
      WHERE status IN ('ativo', 'em_processamento') AND deleted_at IS NULL
    ),
    'peso_em_processamento_kg', (
      SELECT COALESCE(SUM(peso_inicial), 0) FROM lotes 
      WHERE status IN ('ativo', 'em_processamento') AND deleted_at IS NULL
    ),
    
    -- Total Geral (finalizados + ativos)
    'peso_total_processado_kg', (
      SELECT COALESCE(SUM(peso_inicial), 0) FROM lotes WHERE deleted_at IS NULL
    ),
    'peso_total_processado_ton', (
      SELECT ROUND(COALESCE(SUM(peso_inicial), 0) / 1000, 4) FROM lotes WHERE deleted_at IS NULL
    ),
    'co2e_total_evitado_ton', (
      SELECT ROUND(COALESCE(SUM(peso_inicial * 0.766), 0) / 1000, 4) FROM lotes WHERE deleted_at IS NULL
    ),
    
    -- Voluntários e Usuários
    'voluntarios_ativos', (
      SELECT COUNT(*) FROM voluntarios 
      WHERE ativo = true AND deleted_at IS NULL
    ),
    'voluntarios_total_cadastrados', (
      SELECT COUNT(*) FROM voluntarios WHERE deleted_at IS NULL
    ),
    'usuarios_sistema_aprovados', (
      SELECT COUNT(*) FROM profiles 
      WHERE status = 'approved' AND deleted_at IS NULL
    ),
    
    -- Entregas
    'total_entregas', (
      SELECT COUNT(*) FROM entregas WHERE deleted_at IS NULL
    ),
    
    -- Unidades
    'unidades_ativas', (SELECT COUNT(*) FROM unidades),
    'unidades', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'codigo', codigo_unidade,
        'nome', nome,
        'localizacao', localizacao,
        'lotes_finalizados', (
          SELECT COUNT(*) FROM lotes l 
          WHERE l.unidade = u.codigo_unidade 
          AND l.status = 'encerrado' 
          AND l.deleted_at IS NULL
        ),
        'peso_processado_ton', (
          SELECT ROUND(COALESCE(SUM(l.peso_inicial), 0) / 1000, 4) FROM lotes l 
          WHERE l.unidade = u.codigo_unidade 
          AND l.status = 'encerrado' 
          AND l.deleted_at IS NULL
        ),
        'co2e_evitado_ton', (
          SELECT ROUND(COALESCE(SUM(l.peso_inicial * 0.766), 0) / 1000, 4) FROM lotes l 
          WHERE l.unidade = u.codigo_unidade 
          AND l.status = 'encerrado' 
          AND l.deleted_at IS NULL
        )
      )), '[]'::jsonb) FROM unidades u
    ),
    
    -- Datas
    'primeira_finalizacao', (
      SELECT MIN(COALESCE(data_finalizacao, data_encerramento)) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    'ultima_finalizacao', (
      SELECT MAX(COALESCE(data_finalizacao, data_encerramento)) FROM lotes 
      WHERE status = 'encerrado' AND deleted_at IS NULL
    ),
    
    -- Metadados de Integridade e Metodologia
    'metodologia_co2e', 'Embrapa Solos 2010 - peso_inicial × 0.766 kg CO₂e/kg resíduo',
    'fonte_referencia', 'https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/882162',
    'integridade_blockchain', (
      SELECT jsonb_build_object(
        'lotes_com_hash', COUNT(hash_integridade),
        'total_lotes', COUNT(*),
        'percentual', ROUND(COUNT(hash_integridade)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
      ) FROM lotes WHERE status = 'encerrado' AND deleted_at IS NULL
    )
  );
$$;