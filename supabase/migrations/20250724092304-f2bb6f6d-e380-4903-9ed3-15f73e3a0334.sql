-- Criar tabela de voluntarios
CREATE TABLE public.voluntarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  numero_balde INTEGER NOT NULL CHECK (numero_balde >= 1 AND numero_balde <= 20),
  unidade TEXT NOT NULL DEFAULT 'CWB001',
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(numero_balde, unidade)
);

-- Criar tabela de entregas
CREATE TABLE public.entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voluntario_id UUID NOT NULL REFERENCES public.voluntarios(id) ON DELETE CASCADE,
  peso DECIMAL(6,2) NOT NULL,
  fotos TEXT[] NOT NULL DEFAULT '{}',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  geolocalizacao_validada BOOLEAN DEFAULT false,
  lote_codigo TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voluntarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- Policies para voluntarios (acesso público para este MVP)
CREATE POLICY "Voluntarios are viewable by everyone" 
ON public.voluntarios 
FOR SELECT 
USING (true);

CREATE POLICY "Voluntarios can be inserted by everyone" 
ON public.voluntarios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Voluntarios can be updated by everyone" 
ON public.voluntarios 
FOR UPDATE 
USING (true);

CREATE POLICY "Voluntarios can be deleted by everyone" 
ON public.voluntarios 
FOR DELETE 
USING (true);

-- Policies para entregas (acesso público para este MVP)
CREATE POLICY "Entregas are viewable by everyone" 
ON public.entregas 
FOR SELECT 
USING (true);

CREATE POLICY "Entregas can be inserted by everyone" 
ON public.entregas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Entregas can be updated by everyone" 
ON public.entregas 
FOR UPDATE 
USING (true);

-- Function para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_voluntarios_updated_at
  BEFORE UPDATE ON public.voluntarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes para performance
CREATE INDEX idx_voluntarios_cpf ON public.voluntarios(cpf);
CREATE INDEX idx_voluntarios_numero_balde_unidade ON public.voluntarios(numero_balde, unidade);
CREATE INDEX idx_entregas_voluntario_id ON public.entregas(voluntario_id);
CREATE INDEX idx_entregas_created_at ON public.entregas(created_at DESC);