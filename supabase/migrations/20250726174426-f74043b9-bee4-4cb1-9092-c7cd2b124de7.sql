-- Remove the fotos column from entregas table
ALTER TABLE public.entregas DROP COLUMN IF EXISTS fotos;

-- Delete the volunteer-photos storage bucket
DELETE FROM storage.buckets WHERE id = 'volunteer-photos';