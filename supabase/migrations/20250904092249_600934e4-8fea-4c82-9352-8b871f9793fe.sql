-- FASE 1: Implementação de Soft Delete Universal
-- Verificar se colunas já existem antes de adicionar

DO $$ 
BEGIN
    -- Adicionar deleted_at às tabelas principais se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.lotes ADD COLUMN deleted_at timestamptz NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entregas' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.entregas ADD COLUMN deleted_at timestamptz NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manejo_semanal' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.manejo_semanal ADD COLUMN deleted_at timestamptz NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entrega_fotos' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.entrega_fotos ADD COLUMN deleted_at timestamptz NULL;
    END IF;
END $$;

-- FASE 2: Evolução da Tabela Lotes
DO $$ 
BEGIN
    -- Adicionar novos campos se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes' AND column_name = 'peso_final') THEN
        ALTER TABLE public.lotes ADD COLUMN peso_final numeric NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes' AND column_name = 'data_finalizacao') THEN
        ALTER TABLE public.lotes ADD COLUMN data_finalizacao timestamptz NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes' AND column_name = 'iot_data') THEN
        ALTER TABLE public.lotes ADD COLUMN iot_data jsonb NULL;
    END IF;
END $$;

-- FASE 3: Nova Estrutura Unificada de Fotos
-- Criar tabela lote_fotos se não existir
CREATE TABLE IF NOT EXISTS public.lote_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES public.lotes(id) NOT NULL,
  entrega_id uuid REFERENCES public.entregas(id) NULL,
  manejo_id uuid REFERENCES public.manejo_semanal(id) NULL,
  foto_url text NOT NULL,
  tipo_foto text NOT NULL CHECK (tipo_foto IN ('entrega_conteudo', 'entrega_pesagem', 'entrega_destino', 'manejo_semanal')),
  ordem_foto integer NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL,
  deleted_at timestamptz NULL
);

-- Criar índices se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lote_fotos_lote_id') THEN
        CREATE INDEX idx_lote_fotos_lote_id ON public.lote_fotos(lote_id) WHERE deleted_at IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lote_fotos_entrega_id') THEN
        CREATE INDEX idx_lote_fotos_entrega_id ON public.lote_fotos(entrega_id) WHERE deleted_at IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lote_fotos_manejo_id') THEN
        CREATE INDEX idx_lote_fotos_manejo_id ON public.lote_fotos(manejo_id) WHERE deleted_at IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lote_fotos_tipo') THEN
        CREATE INDEX idx_lote_fotos_tipo ON public.lote_fotos(tipo_foto) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Trigger para updated_at se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lote_fotos_updated_at') THEN
        CREATE TRIGGER update_lote_fotos_updated_at
        BEFORE UPDATE ON public.lote_fotos
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- FASE 4: Ativar RLS na lote_fotos
ALTER TABLE public.lote_fotos ENABLE ROW LEVEL SECURITY;