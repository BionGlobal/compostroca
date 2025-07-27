
-- Limpar dados de fotos primeiro (referência para entregas)
DELETE FROM entrega_fotos;

-- Limpar dados de manejo semanal
DELETE FROM manejo_semanal;

-- Limpar entregas
DELETE FROM entregas;

-- Limpar lotes
DELETE FROM lotes;

-- Resetar sequências se necessário
-- (Não há sequences neste caso, mas se houvesse seria assim)
-- ALTER SEQUENCE lotes_id_seq RESTART WITH 1;
