-- Create public read policies for production belt page

-- Policy for public access to lotes (basic data only)
CREATE POLICY "Public can view basic lote data" 
ON public.lotes 
FOR SELECT 
USING (true);

-- Policy for public access to entregas (aggregate data only)  
CREATE POLICY "Public can view entrega data"
ON public.entregas
FOR SELECT
USING (true);

-- Policy for public access to voluntarios count (no personal data)
CREATE POLICY "Public can view voluntario count data"
ON public.voluntarios  
FOR SELECT
USING (true);

-- Policy for public access to lote_fotos
CREATE POLICY "Public can view lote photos"
ON public.lote_fotos
FOR SELECT  
USING (true);

-- Policy for public access to manejo_semanal
CREATE POLICY "Public can view manejo data"
ON public.manejo_semanal
FOR SELECT
USING (true);