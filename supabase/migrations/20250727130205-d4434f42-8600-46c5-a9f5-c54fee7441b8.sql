-- Criar tabela para registro de manejo semanal
CREATE TABLE public.manejo_semanal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL,
  caixa_origem INTEGER NOT NULL,
  caixa_destino INTEGER NOT NULL,
  peso_antes NUMERIC NOT NULL,
  peso_depois NUMERIC NOT NULL,
  foto_url TEXT,
  observacoes TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manejo_semanal ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view manejo from their organization" 
ON public.manejo_semanal 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM lotes l
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE l.id = manejo_semanal.lote_id 
  AND p.organization_code = l.unidade
));

CREATE POLICY "Users can insert manejo in their organization" 
ON public.manejo_semanal 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 
  FROM lotes l
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE l.id = manejo_semanal.lote_id 
  AND p.organization_code = l.unidade
));

CREATE POLICY "Users can update manejo from their organization" 
ON public.manejo_semanal 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM lotes l
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE l.id = manejo_semanal.lote_id 
  AND p.organization_code = l.unidade
));

-- Add trigger for timestamps
CREATE TRIGGER update_manejo_semanal_updated_at
BEFORE UPDATE ON public.manejo_semanal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();