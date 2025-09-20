-- Add blockchain-like integrity chain fields to lotes table
ALTER TABLE public.lotes 
ADD COLUMN hash_anterior TEXT,
ADD COLUMN indice_cadeia INTEGER DEFAULT 0;

-- Create index for chain validation queries
CREATE INDEX idx_lotes_indice_cadeia ON public.lotes(indice_cadeia);
CREATE INDEX idx_lotes_hash_anterior ON public.lotes(hash_anterior);

-- Function to get the next chain index
CREATE OR REPLACE FUNCTION public.get_next_chain_index()
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(MAX(indice_cadeia), 0) + 1 FROM public.lotes WHERE deleted_at IS NULL;
$$;

-- Function to get the last chain hash for a unit
CREATE OR REPLACE FUNCTION public.get_last_chain_hash(unit_code TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT hash_integridade 
  FROM public.lotes 
  WHERE unidade = unit_code 
    AND deleted_at IS NULL 
    AND hash_integridade IS NOT NULL
  ORDER BY indice_cadeia DESC 
  LIMIT 1;
$$;