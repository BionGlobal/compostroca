-- Add metadata columns to entrega_fotos table for enhanced photo capture
ALTER TABLE public.entrega_fotos 
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS camera_type TEXT CHECK (camera_type IN ('front', 'back', 'unknown')),
ADD COLUMN IF NOT EXISTS device_orientation TEXT CHECK (device_orientation IN ('portrait', 'landscape', 'unknown')),
ADD COLUMN IF NOT EXISTS gps_coords POINT,
ADD COLUMN IF NOT EXISTS capture_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS device_info JSONB,
ADD COLUMN IF NOT EXISTS image_quality NUMERIC CHECK (image_quality >= 0 AND image_quality <= 1);

-- Add index for performance on metadata searches
CREATE INDEX IF NOT EXISTS idx_entrega_fotos_metadata_gin ON public.entrega_fotos USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_entrega_fotos_capture_timestamp ON public.entrega_fotos (capture_timestamp);
CREATE INDEX IF NOT EXISTS idx_entrega_fotos_gps_coords ON public.entrega_fotos USING GIST (gps_coords);