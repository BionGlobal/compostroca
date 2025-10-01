-- Corrigir função update_lote_eventos_updated_at para incluir search_path
CREATE OR REPLACE FUNCTION public.update_lote_eventos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;