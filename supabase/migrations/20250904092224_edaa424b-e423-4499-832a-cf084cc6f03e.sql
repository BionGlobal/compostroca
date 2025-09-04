-- Criar apenas a tabela lote_fotos que falhou na migração anterior
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lote_fotos_lote_id ON public.lote_fotos(lote_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_fotos_entrega_id ON public.lote_fotos(entrega_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_fotos_manejo_id ON public.lote_fotos(manejo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lote_fotos_tipo ON public.lote_fotos(tipo_foto) WHERE deleted_at IS NULL;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_lote_fotos_updated_at ON public.lote_fotos;
CREATE TRIGGER update_lote_fotos_updated_at
BEFORE UPDATE ON public.lote_fotos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ativar RLS
ALTER TABLE public.lote_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas para lote_fotos
DROP POLICY IF EXISTS "Approved users can view lote photos from authorized units" ON public.lote_fotos;
CREATE POLICY "Approved users can view lote photos from authorized units"
ON public.lote_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "Approved local/super admins can insert lote photos" ON public.lote_fotos;
CREATE POLICY "Approved local/super admins can insert lote photos"
ON public.lote_fotos
FOR INSERT
WITH CHECK (
  can_modify_data() 
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Approved local/super admins can update lote photos" ON public.lote_fotos;
CREATE POLICY "Approved local/super admins can update lote photos"
ON public.lote_fotos
FOR UPDATE
USING (
  can_modify_data() 
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Agora migrar dados existentes
INSERT INTO public.lote_fotos (lote_id, entrega_id, foto_url, tipo_foto, created_at)
SELECT 
  l.id as lote_id,
  ef.entrega_id,
  ef.foto_url,
  CASE 
    WHEN ef.tipo_foto = 'conteudo' THEN 'entrega_conteudo'
    WHEN ef.tipo_foto = 'pesagem' THEN 'entrega_pesagem'
    WHEN ef.tipo_foto = 'destino' THEN 'entrega_destino'
    ELSE ef.tipo_foto
  END as tipo_foto,
  ef.created_at
FROM public.entrega_fotos ef
JOIN public.entregas e ON e.id = ef.entrega_id
JOIN public.lotes l ON l.codigo = e.lote_codigo
WHERE ef.deleted_at IS NULL
  AND e.deleted_at IS NULL
  AND e.lote_codigo IS NOT NULL
  AND l.deleted_at IS NULL
ON CONFLICT DO NOTHING;