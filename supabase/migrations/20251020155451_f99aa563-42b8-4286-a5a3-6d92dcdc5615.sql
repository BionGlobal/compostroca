-- Adicionar colunas de geolocalização à tabela unidades
ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8) NULL,
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8) NULL;

COMMENT ON COLUMN public.unidades.latitude IS 'Latitude da unidade de compostagem (referência para validação de raio)';
COMMENT ON COLUMN public.unidades.longitude IS 'Longitude da unidade de compostagem (referência para validação de raio)';

-- Atualizar dados das unidades existentes com coordenadas reais
-- CWB001 - Instituto Compostroca - Rua 7 de Setembro, 2775 - Centro, Curitiba
UPDATE public.unidades 
SET latitude = -25.4284, longitude = -49.2733 
WHERE codigo_unidade = 'CWB001';

-- PAR001 - Instituto IAPAR-EMATER - Estrada da Graciosa, 6960, Pinhais
UPDATE public.unidades 
SET latitude = -25.3965, longitude = -49.1556 
WHERE codigo_unidade = 'PAR001';

-- Criar função para calcular distância entre dois pontos GPS (Haversine)
CREATE OR REPLACE FUNCTION public.calcular_distancia_metros(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  earth_radius NUMERIC := 6371000; -- Raio da Terra em metros
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  -- Fórmula de Haversine
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon / 2) * SIN(dlon / 2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN earth_radius * c;
END;
$$;

COMMENT ON FUNCTION public.calcular_distancia_metros IS 'Calcula distância em metros entre dois pontos GPS usando fórmula de Haversine';