-- Criar tabela para gerenciar lotes de compostagem
CREATE TABLE public.lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL, -- formato: CWB001-26072025A
  unidade text NOT NULL DEFAULT 'CWB001',
  linha_producao text NOT NULL DEFAULT 'A', -- A, B, C... (futuro)
  caixa_atual integer NOT NULL DEFAULT 1, -- 1 a 7
  semana_atual integer NOT NULL DEFAULT 1, -- 1 a 7
  status text NOT NULL DEFAULT 'ativo', -- 'ativo', 'encerrado'
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_encerramento timestamp with time zone,
  data_proxima_transferencia timestamp with time zone, -- próxima segunda-feira
  latitude numeric,
  longitude numeric,
  peso_inicial numeric DEFAULT 0,
  peso_atual numeric DEFAULT 0, -- calculado dinamicamente
  criado_por uuid NOT NULL,
  criado_por_nome text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lotes
CREATE POLICY "Usuários podem ver lotes da própria organização" 
ON public.lotes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = lotes.unidade
  )
);

CREATE POLICY "Usuários podem criar lotes na própria organização" 
ON public.lotes 
FOR INSERT 
WITH CHECK (
  auth.uid() = criado_por AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = lotes.unidade
  )
);

CREATE POLICY "Usuários podem atualizar lotes da própria organização" 
ON public.lotes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = lotes.unidade
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lotes_updated_at
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_lotes_unidade_caixa_status ON public.lotes(unidade, caixa_atual, status);
CREATE INDEX idx_lotes_codigo ON public.lotes(codigo);
CREATE INDEX idx_lotes_status ON public.lotes(status);