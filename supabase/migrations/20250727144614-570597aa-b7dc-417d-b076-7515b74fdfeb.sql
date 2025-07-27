-- Create storage bucket for manejo photos
INSERT INTO storage.buckets (id, name, public) VALUES ('manejo-fotos', 'manejo-fotos', true);

-- Create policies for manejo photos storage
CREATE POLICY "Manejo photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manejo-fotos');

CREATE POLICY "Users can upload manejo photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'manejo-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their manejo photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'manejo-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their manejo photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'manejo-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);