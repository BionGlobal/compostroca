-- Fase 1: Corrigir lotes que têm apenas o código da unidade (texto)
-- mas não têm a foreign key unidade_id preenchida
UPDATE lotes l
SET unidade_id = u.id
FROM unidades u
WHERE l.unidade = u.codigo_unidade
  AND l.unidade_id IS NULL
  AND l.deleted_at IS NULL;