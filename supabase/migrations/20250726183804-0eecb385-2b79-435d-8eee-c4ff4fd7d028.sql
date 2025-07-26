-- Deletar a última entrega da Claudia Cobalea e suas fotos associadas
DELETE FROM entrega_fotos WHERE entrega_id = '3ce814e8-8424-451d-9fca-12c9088a9b18';
DELETE FROM entregas WHERE id = '3ce814e8-8424-451d-9fca-12c9088a9b18';