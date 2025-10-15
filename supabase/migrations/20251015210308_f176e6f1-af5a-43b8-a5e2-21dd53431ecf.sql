-- Atualizar lotes sem unidade_id para associar com a unidade correta baseado no código
UPDATE lotes
SET unidade_id = u.id
FROM unidades u
WHERE lotes.unidade = u.codigo_unidade
  AND lotes.unidade_id IS NULL
  AND lotes.deleted_at IS NULL;

-- Verificar resultado
SELECT 
  l.codigo_unico, 
  l.unidade, 
  u.nome as unidade_nome,
  u.localizacao
FROM lotes l
LEFT JOIN unidades u ON l.unidade_id = u.id
WHERE l.codigo_unico = 'CWB001-09102025A002';