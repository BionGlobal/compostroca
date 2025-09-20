-- Inserir nova unidade PAR001
INSERT INTO public.unidades (codigo_unidade, nome, localizacao) 
VALUES (
  'PAR001',
  'Instituto de Desenvolvimento Rural - IAPAR-EMATER',
  'Estrada da Graciosa, 6960, Pinhais 83327-055'
) ON CONFLICT (codigo_unidade) DO NOTHING;

-- Atualizar lotes finalizados com cálculos de CO2e e CAU
UPDATE public.lotes 
SET 
  co2eq_evitado = peso_inicial * 0.766,
  creditos_cau = peso_inicial / 1000.0
WHERE status = 'encerrado' 
  AND peso_inicial IS NOT NULL
  AND peso_inicial > 0
  AND (co2eq_evitado IS NULL OR co2eq_evitado = 0);

-- Atualizar função de busca para incluir mais campos e filtros
CREATE OR REPLACE FUNCTION public.buscar_lotes_finalizados(
  pagina integer DEFAULT 1, 
  termo_busca text DEFAULT ''::text,
  unidade_filter text DEFAULT ''::text,
  data_inicio date DEFAULT NULL::date,
  data_fim date DEFAULT NULL::date,
  validador_filter text DEFAULT ''::text
)
RETURNS TABLE(
  id uuid, 
  codigo_unico text, 
  codigo text, 
  unidade_nome text, 
  unidade_codigo text, 
  data_finalizacao timestamp with time zone, 
  co2eq_evitado numeric, 
  hash_integridade text, 
  peso_inicial numeric, 
  peso_final numeric, 
  criado_por_nome text,
  total_count bigint,
  total_fotos bigint,
  total_entregas bigint
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
      u.nome as unidade_nome,
      u.codigo_unidade as unidade_codigo,
      l.data_finalizacao,
      l.co2eq_evitado,
      l.hash_integridade,
      l.peso_inicial,
      l.peso_final,
      l.criado_por_nome,
      COUNT(*) OVER() as total_count,
      COALESCE(foto_count.total_fotos, 0) as total_fotos,
      COALESCE(entrega_count.total_entregas, 0) as total_entregas
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
    WHERE l.status = 'encerrado' 
      AND l.deleted_at IS NULL
      AND (
        termo_busca = '' 
        OR l.codigo_unico ILIKE '%' || termo_busca || '%'
        OR l.hash_integridade ILIKE '%' || termo_busca || '%'
        OR l.codigo ILIKE '%' || termo_busca || '%'
        OR l.criado_por_nome ILIKE '%' || termo_busca || '%'
      )
      AND (
        unidade_filter = '' 
        OR u.codigo_unidade = unidade_filter
      )
      AND (
        data_inicio IS NULL 
        OR l.data_finalizacao >= data_inicio
      )
      AND (
        data_fim IS NULL 
        OR l.data_finalizacao <= data_fim
      )
      AND (
        validador_filter = '' 
        OR l.criado_por_nome ILIKE '%' || validador_filter || '%'
      )
    ORDER BY l.data_finalizacao DESC NULLS LAST
  )
  SELECT 
    fl.id,
    fl.codigo_unico,
    fl.codigo,
    fl.unidade_nome,
    fl.unidade_codigo,
    fl.data_finalizacao,
    fl.co2eq_evitado,
    fl.hash_integridade,
    fl.peso_inicial,
    fl.peso_final,
    fl.criado_por_nome,
    fl.total_count,
    fl.total_fotos,
    fl.total_entregas
  FROM filtered_lotes fl
  LIMIT 20 OFFSET (pagina - 1) * 20;
$function$;