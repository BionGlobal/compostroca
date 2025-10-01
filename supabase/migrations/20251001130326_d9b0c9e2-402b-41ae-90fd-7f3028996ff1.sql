-- Criar tabela de sessões de manutenção compartilhadas
CREATE TABLE IF NOT EXISTS public.sessoes_manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_sessao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  administrador_id UUID REFERENCES auth.users(id),
  administrador_nome TEXT NOT NULL,
  unidade_codigo TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  fotos_gerais JSONB DEFAULT '[]'::jsonb,
  observacoes_gerais TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar referência de sessão na tabela lote_eventos
ALTER TABLE public.lote_eventos 
ADD COLUMN IF NOT EXISTS sessao_manutencao_id UUID REFERENCES public.sessoes_manutencao(id);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_sessoes_manutencao_data_unidade 
ON public.sessoes_manutencao(data_sessao, unidade_codigo) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessoes_manutencao_administrador 
ON public.sessoes_manutencao(administrador_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lote_eventos_sessao 
ON public.lote_eventos(sessao_manutencao_id) 
WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.sessoes_manutencao ENABLE ROW LEVEL SECURITY;

-- RLS Policies para sessoes_manutencao
CREATE POLICY "Approved users can view sessions from authorized units"
ON public.sessoes_manutencao
FOR SELECT
USING (has_unit_access(unidade_codigo));

CREATE POLICY "Approved local/super admins can insert sessions"
ON public.sessoes_manutencao
FOR INSERT
WITH CHECK (
  can_modify_data() 
  AND has_unit_access(unidade_codigo)
  AND auth.uid() = administrador_id
);

CREATE POLICY "Approved local/super admins can update sessions"
ON public.sessoes_manutencao
FOR UPDATE
USING (can_modify_data() AND has_unit_access(unidade_codigo));

CREATE POLICY "Approved local/super admins can delete sessions"
ON public.sessoes_manutencao
FOR DELETE
USING (can_modify_data() AND has_unit_access(unidade_codigo));

CREATE POLICY "Public can view session data"
ON public.sessoes_manutencao
FOR SELECT
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_sessoes_manutencao_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sessoes_manutencao_updated_at
BEFORE UPDATE ON public.sessoes_manutencao
FOR EACH ROW
EXECUTE FUNCTION update_sessoes_manutencao_updated_at();