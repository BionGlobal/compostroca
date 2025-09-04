-- Corrigir migração de dados de fotos
-- Primeiro vamos verificar a estrutura correta dos dados

-- Migrar dados existentes da entrega_fotos para lote_fotos
-- Usar subquery para encontrar o lote_id correto baseado no código
INSERT INTO public.lote_fotos (lote_id, entrega_id, foto_url, tipo_foto, created_at)
SELECT 
  l.id as lote_id,
  ef.entrega_id,
  ef.foto_url,
  CASE 
    WHEN ef.tipo_foto = 'conteudo' THEN 'entrega_conteudo'
    WHEN ef.tipo_foto = 'pesagem' THEN 'entrega_pesagem'
    WHEN ef.tipo_foto = 'destino' THEN 'entrega_destino'
    ELSE ef.tipo_foto
  END as tipo_foto,
  ef.created_at
FROM public.entrega_fotos ef
JOIN public.entregas e ON e.id = ef.entrega_id
JOIN public.lotes l ON l.codigo = e.lote_codigo
WHERE ef.deleted_at IS NULL
  AND e.deleted_at IS NULL
  AND e.lote_codigo IS NOT NULL
  AND l.deleted_at IS NULL;