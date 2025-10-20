-- Corrigir coordenadas da unidade CWB001 para o local real em Cajuru
UPDATE public.unidades
SET 
  latitude = -25.4404681,
  longitude = -49.2231962
WHERE codigo_unidade = 'CWB001';

COMMENT ON COLUMN public.unidades.latitude IS 'Latitude da unidade (formato decimal, WGS84)';
COMMENT ON COLUMN public.unidades.longitude IS 'Longitude da unidade (formato decimal, WGS84)';