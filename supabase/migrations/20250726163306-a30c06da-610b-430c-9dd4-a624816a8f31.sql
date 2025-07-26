-- Tornar o bucket volunteer-photos público e criar políticas de acesso
UPDATE storage.buckets 
SET public = true 
WHERE id = 'volunteer-photos';

-- Criar políticas para permitir uploads e acesso às fotos
CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'volunteer-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'volunteer-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'volunteer-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'volunteer-photos' AND auth.uid() IS NOT NULL);