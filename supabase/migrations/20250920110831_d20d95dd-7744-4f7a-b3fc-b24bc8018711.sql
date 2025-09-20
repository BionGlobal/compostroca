-- Fix security linter warnings for new functions by adding search_path
DROP FUNCTION IF EXISTS public.get_next_chain_index();
DROP FUNCTION IF EXISTS public.get_last_chain_hash(TEXT);

-- Function to get the next chain index with proper search_path
CREATE OR REPLACE FUNCTION public.get_next_chain_index()
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(indice_cadeia), 0) + 1 FROM public.lotes WHERE deleted_at IS NULL;
$$;

-- Function to get the last chain hash for a unit with proper search_path
CREATE OR REPLACE FUNCTION public.get_last_chain_hash(unit_code TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hash_integridade 
  FROM public.lotes 
  WHERE unidade = unit_code 
    AND deleted_at IS NULL 
    AND hash_integridade IS NOT NULL
  ORDER BY indice_cadeia DESC 
  LIMIT 1;
$$;