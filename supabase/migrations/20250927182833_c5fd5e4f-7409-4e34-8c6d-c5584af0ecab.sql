-- Marcar fotos órfãs como deletadas (fotos de entregas que foram soft-deleted)
UPDATE entrega_fotos 
SET deleted_at = now() 
WHERE entrega_id IN (
  SELECT id FROM entregas WHERE deleted_at IS NOT NULL
) 
AND deleted_at IS NULL;

-- Também marcar fotos de lote que referenciam entregas deletadas
UPDATE lote_fotos 
SET deleted_at = now() 
WHERE entrega_id IN (
  SELECT id FROM entregas WHERE deleted_at IS NOT NULL
) 
AND deleted_at IS NULL;