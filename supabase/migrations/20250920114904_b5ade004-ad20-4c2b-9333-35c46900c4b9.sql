-- Criar tabela unidades
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_unidade TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir dados das unidades existentes
INSERT INTO public.unidades (codigo_unidade, nome, localizacao) VALUES
('CWB001', 'Fazenda Urbana Cajuru', 'Rua XV de Novembro, 123 - Cajuru, Curitiba - PR'),
('CWB002', 'Fazenda Urbana Boqueirão', 'Av. São José, 456 - Boqueirão, Curitiba - PR'),
('CWB003', 'Fazenda Urbana Portão', 'Rua Portão, 789 - Portão, Curitiba - PR');

-- Adicionar coluna unidade_id na tabela lotes se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lotes' AND column_name='unidade_id') THEN
    ALTER TABLE public.lotes ADD COLUMN unidade_id UUID;
  END IF;
END $$;

-- Atualizar lotes existentes para referenciar as unidades corretas
UPDATE public.lotes 
SET unidade_id = (
  SELECT id FROM public.unidades 
  WHERE codigo_unidade = lotes.unidade
)
WHERE unidade_id IS NULL;

-- Adicionar foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_lotes_unidade') THEN
    ALTER TABLE public.lotes 
    ADD CONSTRAINT fk_lotes_unidade 
    FOREIGN KEY (unidade_id) REFERENCES public.unidades(id);
  END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_lotes_hash_integridade ON public.lotes(hash_integridade);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON public.lotes(status);
CREATE INDEX IF NOT EXISTS idx_lotes_unidade_id ON public.lotes(unidade_id);

-- Enable RLS na tabela unidades
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura pública das unidades
CREATE POLICY "Unidades são visíveis publicamente" 
ON public.unidades 
FOR SELECT 
USING (true);

-- Função RPC para buscar todas as unidades
CREATE OR REPLACE FUNCTION public.get_todas_unidades()
RETURNS TABLE(
  id UUID,
  codigo_unidade TEXT,
  nome TEXT,
  localizacao TEXT,
  total_lotes BIGINT,
  lotes_ativos BIGINT,
  lotes_finalizados BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.codigo_unidade,
    u.nome,
    u.localizacao,
    COUNT(l.id) as total_lotes,
    COUNT(CASE WHEN l.status = 'em_processamento' THEN 1 END) as lotes_ativos,
    COUNT(CASE WHEN l.status = 'encerrado' THEN 1 END) as lotes_finalizados
  FROM public.unidades u
  LEFT JOIN public.lotes l ON u.id = l.unidade_id AND l.deleted_at IS NULL
  GROUP BY u.id, u.codigo_unidade, u.nome, u.localizacao
  ORDER BY u.codigo_unidade;
$$;

-- Função RPC para buscar lotes finalizados com paginação
CREATE OR REPLACE FUNCTION public.buscar_lotes_finalizados(
  pagina INT DEFAULT 1,
  termo_busca TEXT DEFAULT ''
)
RETURNS TABLE(
  id UUID,
  codigo_unico TEXT,
  codigo TEXT,
  unidade_nome TEXT,
  unidade_codigo TEXT,
  data_finalizacao TIMESTAMP WITH TIME ZONE,
  co2eq_evitado NUMERIC,
  hash_integridade TEXT,
  peso_inicial NUMERIC,
  peso_final NUMERIC,
  total_count BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      COUNT(*) OVER() as total_count
    FROM public.lotes l
    JOIN public.unidades u ON l.unidade_id = u.id
    WHERE l.status = 'encerrado' 
      AND l.deleted_at IS NULL
      AND (
        termo_busca = '' 
        OR l.codigo_unico ILIKE '%' || termo_busca || '%'
        OR l.hash_integridade ILIKE '%' || termo_busca || '%'
        OR l.codigo ILIKE '%' || termo_busca || '%'
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
    fl.total_count
  FROM filtered_lotes fl
  LIMIT 20 OFFSET (pagina - 1) * 20;
$$;