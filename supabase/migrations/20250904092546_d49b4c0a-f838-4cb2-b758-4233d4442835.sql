-- Criar bucket para fotos dos lotes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lote-fotos', 'lote-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para lote-fotos
-- Permitir visualização pública
CREATE POLICY "Lote photos are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lote-fotos');

-- Permitir upload apenas para usuários autenticados com permissão
CREATE POLICY "Authenticated users can upload lote photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lote-fotos' 
  AND auth.role() = 'authenticated'
);

-- Permitir atualização apenas para usuários autenticados com permissão
CREATE POLICY "Authenticated users can update lote photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lote-fotos' 
  AND auth.role() = 'authenticated'
);

-- Permitir deleção apenas para usuários autenticados com permissão
CREATE POLICY "Authenticated users can delete lote photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lote-fotos' 
  AND auth.role() = 'authenticated'
);