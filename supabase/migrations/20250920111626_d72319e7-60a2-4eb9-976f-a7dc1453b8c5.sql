-- Add impact calculation fields to lotes table
ALTER TABLE public.lotes 
ADD COLUMN co2eq_evitado NUMERIC DEFAULT 0,
ADD COLUMN creditos_cau NUMERIC DEFAULT 0,
ADD COLUMN qr_code_url TEXT,
ADD COLUMN codigo_unico TEXT UNIQUE;

-- Update existing lotes to have codigo_unico based on codigo
UPDATE public.lotes SET codigo_unico = codigo WHERE codigo_unico IS NULL;

-- Create lotes_manutencoes junction table for tracking weekly maintenance per batch
CREATE TABLE public.lotes_manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL,
  manejo_id UUID NOT NULL,
  semana_numero INTEGER NOT NULL CHECK (semana_numero >= 1 AND semana_numero <= 7),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lote_id, semana_numero)
);

-- Enable RLS on new table
ALTER TABLE public.lotes_manutencoes ENABLE ROW LEVEL SECURITY;

-- Create policies for lotes_manutencoes
CREATE POLICY "Approved users can view lote manutencoes from authorized units"
ON public.lotes_manutencoes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM lotes l 
  WHERE l.id = lotes_manutencoes.lote_id 
  AND has_unit_access(l.unidade)
));

CREATE POLICY "Approved local/super admins can insert lote manutencoes"
ON public.lotes_manutencoes
FOR INSERT
WITH CHECK (can_modify_data() AND EXISTS (
  SELECT 1 FROM lotes l 
  WHERE l.id = lotes_manutencoes.lote_id 
  AND has_unit_access(l.unidade)
));

CREATE POLICY "Approved local/super admins can update lote manutencoes"
ON public.lotes_manutencoes
FOR UPDATE
USING (can_modify_data() AND EXISTS (
  SELECT 1 FROM lotes l 
  WHERE l.id = lotes_manutencoes.lote_id 
  AND has_unit_access(l.unidade)
));

CREATE POLICY "Approved local/super admins can delete lote manutencoes"
ON public.lotes_manutencoes
FOR DELETE
USING (can_modify_data() AND EXISTS (
  SELECT 1 FROM lotes l 
  WHERE l.id = lotes_manutencoes.lote_id 
  AND has_unit_access(l.unidade)
));

-- Add trigger to update updated_at
CREATE TRIGGER update_lotes_manutencoes_updated_at
BEFORE UPDATE ON public.lotes_manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Improve entregas table to use lote_id instead of lote_codigo for better integrity
ALTER TABLE public.entregas ADD COLUMN lote_id UUID;

-- Update existing entregas to use lote_id based on lote_codigo
UPDATE public.entregas 
SET lote_id = (
  SELECT l.id FROM lotes l 
  WHERE l.codigo = entregas.lote_codigo 
  AND l.deleted_at IS NULL
) 
WHERE lote_codigo IS NOT NULL;

-- Create indexes for performance
CREATE INDEX idx_entregas_lote_id ON public.entregas(lote_id);
CREATE INDEX idx_lotes_manutencoes_lote_id ON public.lotes_manutencoes(lote_id);
CREATE INDEX idx_lotes_manutencoes_manejo_id ON public.lotes_manutencoes(manejo_id);
CREATE INDEX idx_lotes_codigo_unico ON public.lotes(codigo_unico);

-- Function to validate if lote has all 7 weekly maintenances
CREATE OR REPLACE FUNCTION public.lote_tem_7_manutencoes(lote_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT lm.semana_numero) = 7
  FROM lotes_manutencoes lm
  WHERE lm.lote_id = lote_id_param;
$$;

-- Function to calculate environmental impact
CREATE OR REPLACE FUNCTION public.calcular_impacto_lote(lote_id_param UUID)
RETURNS TABLE(co2eq_evitado_calc NUMERIC, creditos_cau_calc NUMERIC)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (peso_inicial * 0.766) as co2eq_evitado_calc,
    (peso_inicial / 1000.0) as creditos_cau_calc
  FROM lotes 
  WHERE id = lote_id_param;
$$;