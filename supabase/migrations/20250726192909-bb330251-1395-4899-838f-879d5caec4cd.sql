-- Create bucket for volunteer photos
INSERT INTO storage.buckets (id, name, public) VALUES ('voluntarios-fotos', 'voluntarios-fotos', true);

-- Create policies for volunteer photos
CREATE POLICY "Volunteer photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'voluntarios-fotos');

CREATE POLICY "Authenticated users can upload volunteer photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'voluntarios-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update volunteer photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'voluntarios-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete volunteer photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'voluntarios-fotos' AND auth.uid() IS NOT NULL);