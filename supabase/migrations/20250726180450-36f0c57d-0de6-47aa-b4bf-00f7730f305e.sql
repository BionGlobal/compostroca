-- Criar tabela para armazenar as fotos das entregas
CREATE TABLE public.entrega_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrega_id UUID NOT NULL,
  tipo_foto TEXT NOT NULL CHECK (tipo_foto IN ('conteudo', 'pesagem', 'destino')),
  foto_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entrega_id, tipo_foto)
);

-- Habilitar RLS
ALTER TABLE public.entrega_fotos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view photos from their organization" 
ON public.entrega_fotos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM entregas e
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = entrega_fotos.entrega_id 
  AND p.organization_code = v.unidade
));

CREATE POLICY "Users can insert photos from their organization" 
ON public.entrega_fotos 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM entregas e
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = entrega_fotos.entrega_id 
  AND p.organization_code = v.unidade
));

CREATE POLICY "Users can update photos from their organization" 
ON public.entrega_fotos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM entregas e
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = entrega_fotos.entrega_id 
  AND p.organization_code = v.unidade
));

CREATE POLICY "Users can delete photos from their organization" 
ON public.entrega_fotos 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM entregas e
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = entrega_fotos.entrega_id 
  AND p.organization_code = v.unidade
));

-- Criar bucket de storage para fotos das entregas
INSERT INTO storage.buckets (id, name, public) VALUES ('entrega-fotos', 'entrega-fotos', true);

-- Criar políticas para o bucket
CREATE POLICY "Users can view photos from their organization"
ON storage.objects FOR SELECT
USING (bucket_id = 'entrega-fotos' AND EXISTS (
  SELECT 1 FROM entrega_fotos ef
  JOIN entregas e ON e.id = ef.entrega_id
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE ef.foto_url = storage.objects.name
  AND p.organization_code = v.unidade
));

CREATE POLICY "Users can upload photos from their organization"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'entrega-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update photos from their organization"
ON storage.objects FOR UPDATE
USING (bucket_id = 'entrega-fotos' AND EXISTS (
  SELECT 1 FROM entrega_fotos ef
  JOIN entregas e ON e.id = ef.entrega_id
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE ef.foto_url = storage.objects.name
  AND p.organization_code = v.unidade
));

CREATE POLICY "Users can delete photos from their organization"
ON storage.objects FOR DELETE
USING (bucket_id = 'entrega-fotos' AND EXISTS (
  SELECT 1 FROM entrega_fotos ef
  JOIN entregas e ON e.id = ef.entrega_id
  JOIN voluntarios v ON v.id = e.voluntario_id
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE ef.foto_url = storage.objects.name
  AND p.organization_code = v.unidade
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_entrega_fotos_updated_at
BEFORE UPDATE ON public.entrega_fotos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();