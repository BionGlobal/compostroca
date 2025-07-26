-- Tornar o bucket volunteer-photos público para resolver problemas de upload
UPDATE storage.buckets 
SET public = true 
WHERE id = 'volunteer-photos';