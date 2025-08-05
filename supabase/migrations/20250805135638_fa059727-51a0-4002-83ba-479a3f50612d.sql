-- Limpeza completa do banco de dados para testes reais
-- Ordem específica para respeitar foreign keys

-- 1. Limpar fotos de entregas (depende de entregas)
DELETE FROM entrega_fotos;

-- 2. Limpar manejo semanal (depende de lotes) 
DELETE FROM manejo_semanal;

-- 3. Limpar entregas (depende de voluntarios)
DELETE FROM entregas;

-- 4. Limpar lotes
DELETE FROM lotes;

-- 5. Limpar voluntários
DELETE FROM voluntarios;

-- Limpar todos os arquivos dos buckets de storage
DELETE FROM storage.objects WHERE bucket_id IN ('entrega-fotos', 'manejo-fotos', 'voluntarios-fotos');