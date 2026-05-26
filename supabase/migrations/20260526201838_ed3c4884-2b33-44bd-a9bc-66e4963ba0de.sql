-- Permitir leitura pública das fotos de entrega (consistente com entregas, manejo_semanal, lote_fotos)
DROP POLICY IF EXISTS "Public can view entrega photos" ON public.entrega_fotos;
CREATE POLICY "Public can view entrega photos"
ON public.entrega_fotos
FOR SELECT
TO public
USING (true);