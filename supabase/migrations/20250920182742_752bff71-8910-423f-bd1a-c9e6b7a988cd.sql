-- Recriar a função com correções
DROP FUNCTION IF EXISTS public.buscar_lotes_por_status(integer, text, text, date, date, text, text);

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
  WITH filtered_lotes AS (
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
      END as progresso_percent,
      COUNT(*) OVER() as total_count,
      COALESCE(foto_count.total_fotos, 0) as total_fotos,
      COALESCE(entrega_count.total_entregas, 0) as total_entregas,
      COALESCE(manutencao_count.total_manutencoes, 0) as total_manutencoes
    FROM public.lotes l
    JOIN public.unidades u ON l.unidade_id = u.id
    LEFT JOIN (
      SELECT lote_id, COUNT(*) as total_fotos 
      FROM public.lote_fotos 
      WHERE deleted_at IS NULL 
      GROUP BY lote_id
    ) foto_count ON l.id = foto_count.lote_id
    LEFT JOIN (
      SELECT lote_codigo, COUNT(*) as total_entregas 
      FROM public.entregas 
      WHERE deleted_at IS NULL 
      GROUP BY lote_codigo
    ) entrega_count ON l.codigo = entrega_count.lote_codigo
    LEFT JOIN (
      SELECT lote_id, COUNT(*) as total_manutencoes 
      FROM public.manejo_semanal 
      WHERE deleted_at IS NULL 
      GROUP BY lote_id
    ) manutencao_count ON l.id = manutencao_count.lote_id
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
    ORDER BY 
      CASE 
        WHEN l.status IN ('ativo', 'em_processamento') THEN 0 
        ELSE 1 
      END,
      CASE 
        WHEN l.status IN ('ativo', 'em_processamento') THEN l.data_inicio 
        ELSE COALESCE(l.data_finalizacao, l.data_encerramento, l.updated_at) 
      END DESC NULLS LAST
  )
  SELECT 
    fl.id,
    fl.codigo_unico,
    fl.codigo,
    fl.status,
    fl.unidade_nome,
    fl.unidade_codigo,
    fl.data_finalizacao,
    fl.co2eq_evitado,
    fl.hash_integridade,
    fl.peso_inicial,
    fl.peso_final,
    fl.peso_atual,
    fl.criado_por_nome,
    fl.data_inicio,
    fl.semana_atual,
    fl.caixa_atual,
    fl.progresso_percent,
    fl.total_count,
    fl.total_fotos,
    fl.total_entregas,
    fl.total_manutencoes
  FROM filtered_lotes fl
  LIMIT 10 OFFSET (pagina - 1) * 10;
$function$;