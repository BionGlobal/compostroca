-- Função simplificada para debug
CREATE OR REPLACE FUNCTION public.buscar_lotes_por_status_debug(
  status_filter text DEFAULT 'todos'
)
RETURNS TABLE(
  id uuid,
  codigo text,
  status text,
  unidade_nome text,
  total_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    l.id,
    l.codigo,
    l.status,
    u.nome as unidade_nome,
    COUNT(*) OVER() as total_count
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
  ORDER BY l.created_at DESC
  LIMIT 5;
$function$;