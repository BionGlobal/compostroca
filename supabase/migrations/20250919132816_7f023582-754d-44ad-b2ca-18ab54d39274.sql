-- Add DELETE policies to allow proper cancellation cleanup
-- 1) lotes
CREATE POLICY IF NOT EXISTS "Approved local/super admins can delete lotes"
ON public.lotes
FOR DELETE
USING (can_modify_data() AND has_unit_access(unidade));

-- 2) entregas
CREATE POLICY IF NOT EXISTS "Approved local/super admins can delete entregas"
ON public.entregas
FOR DELETE
USING (
  can_modify_data() AND EXISTS (
    SELECT 1 FROM voluntarios v
    WHERE v.id = entregas.voluntario_id
      AND has_unit_access(v.unidade)
  )
);

-- 3) manejo_semanal
CREATE POLICY IF NOT EXISTS "Approved local/super admins can delete manejo"
ON public.manejo_semanal
FOR DELETE
USING (
  can_modify_data() AND EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.id = manejo_semanal.lote_id
      AND has_unit_access(l.unidade)
  )
);

-- Cleanup orphaned data for the problematic lote code
-- Remove entrega photos linked to deliveries of the lote
DELETE FROM public.entrega_fotos ef
USING public.entregas e
WHERE ef.entrega_id = e.id
  AND e.lote_codigo = 'CWB001-17092025A158';

-- Remove deliveries for the lote
DELETE FROM public.entregas
WHERE lote_codigo = 'CWB001-17092025A158';

-- Remove lote photos for the lote
DELETE FROM public.lote_fotos lf
USING public.lotes l
WHERE lf.lote_id = l.id
  AND l.codigo = 'CWB001-17092025A158';

-- Remove manejo semanal for the lote
DELETE FROM public.manejo_semanal m
USING public.lotes l
WHERE m.lote_id = l.id
  AND l.codigo = 'CWB001-17092025A158';

-- Finally, remove the lote itself
DELETE FROM public.lotes
WHERE codigo = 'CWB001-17092025A158';