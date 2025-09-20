-- Função simplificada para testar
CREATE OR REPLACE FUNCTION public.buscar_lotes_por_status(
  pagina integer DEFAULT 1,
  termo_busca text DEFAULT '',
  unidade_filter text DEFAULT '',
  data_inicio date DEFAULT NULL,
  data_fim date DEFAULT NULL,
  validador_filter text DEFAULT '',
  status_filter text DEFAULT 'todos'
)
RETURNS TABLE(
  id uuid,
  codigo_unico text,
  codigo text,
  status text,
  unidade_nome text,
  unidade_codigo text,
  data_finalizacao timestamp with time zone,
  co2eq_evitado numeric,
  hash_integridade text,
  peso_inicial numeric,
  peso_final numeric,
  peso_atual numeric,
  criado_por_nome text,
  data_inicio timestamp with time zone,
  semana_atual integer,
  caixa_atual integer,
  progresso_percent numeric,
  total_count bigint,
  total_fotos bigint,
  total_entregas bigint,
  total_manutencoes bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base_query AS (
    SELECT 
      l.id,
      l.codigo_unico,
      l.codigo,
      l.status,
      u.nome as unidade_nome,
      u.codigo_unidade as unidade_codigo,
      COALESCE(l.data_finalizacao, l.data_encerramento) as data_finalizacao,
      l.co2eq_evitado,
      l.hash_integridade,
      l.peso_inicial,
      l.peso_final,
      l.peso_atual,
      l.criado_por_nome,
      l.data_inicio,
      l.semana_atual,
      l.caixa_atual,
      CASE 
        WHEN l.status IN ('ativo', 'em_processamento') THEN 
          ROUND((COALESCE(l.semana_atual, 1)::numeric / 7.0) * 100, 1)
        ELSE NULL 
      END as progresso_percent
    FROM public.lotes l
    JOIN public.unidades u ON l.unidade_id = u.id
    WHERE l.deleted_at IS NULL
      AND (
        status_filter = 'todos' 
        OR (status_filter = 'finalizados' AND l.status = 'encerrado')
        OR (status_filter = 'ativos' AND l.status IN ('ativo', 'em_processamento'))
        OR (status_filter = 'ativo' AND l.status = 'ativo')
        OR (status_filter = 'em_processamento' AND l.status = 'em_processamento')
        OR (status_filter = 'encerrado' AND l.status = 'encerrado')
      )
      AND (
        termo_busca = '' 
        OR l.codigo_unico ILIKE '%' || termo_busca || '%'
        OR COALESCE(l.hash_integridade, '') ILIKE '%' || termo_busca || '%'
        OR l.codigo ILIKE '%' || termo_busca || '%'
        OR COALESCE(l.criado_por_nome, '') ILIKE '%' || termo_busca || '%'
      )
      AND (
        unidade_filter = '' 
        OR u.codigo_unidade = unidade_filter
      )
      AND (
        data_inicio IS NULL 
        OR l.data_inicio::date >= data_inicio
      )
      AND (
        data_fim IS NULL 
        OR l.data_inicio::date <= data_fim
      )
      AND (
        validador_filter = '' 
        OR COALESCE(l.criado_por_nome, '') ILIKE '%' || validador_filter || '%'
      )
  ),
  with_counts AS (
    SELECT 
      bq.*,
      COUNT(*) OVER() as total_count,
      COALESCE(
        (SELECT COUNT(*) FROM public.lote_fotos lf WHERE lf.lote_id = bq.id AND lf.deleted_at IS NULL), 
        0
      ) as total_fotos,
      COALESCE(
        (SELECT COUNT(*) FROM public.entregas e WHERE e.lote_codigo = bq.codigo AND e.deleted_at IS NULL), 
        0
      ) as total_entregas,
      COALESCE(
        (SELECT COUNT(*) FROM public.manejo_semanal ms WHERE ms.lote_id = bq.id AND ms.deleted_at IS NULL), 
        0
      ) as total_manutencoes
    FROM base_query bq
    ORDER BY 
      CASE 
        WHEN bq.status IN ('ativo', 'em_processamento') THEN 0 
        ELSE 1 
      END,
      CASE 
        WHEN bq.status IN ('ativo', 'em_processamento') THEN bq.data_inicio 
        ELSE COALESCE(bq.data_finalizacao, bq.data_inicio) 
      END DESC NULLS LAST
  )
  SELECT 
    wc.id,
    wc.codigo_unico,
    wc.codigo,
    wc.status,
    wc.unidade_nome,
    wc.unidade_codigo,
    wc.data_finalizacao,
    wc.co2eq_evitado,
    wc.hash_integridade,
    wc.peso_inicial,
    wc.peso_final,
    wc.peso_atual,
    wc.criado_por_nome,
    wc.data_inicio,
    wc.semana_atual,
    wc.caixa_atual,
    wc.progresso_percent,
    wc.total_count,
    wc.total_fotos,
    wc.total_entregas,
    wc.total_manutencoes
  FROM with_counts wc
  LIMIT 10 OFFSET (pagina - 1) * 10;
$function$;