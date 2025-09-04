-- Migrar dados existentes sem referência ao campo deleted_at que ainda não existe
-- Primeiro limpar tentativas anteriores
DELETE FROM public.lote_fotos;

-- Migrar dados de entrega_fotos para lote_fotos
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
WHERE e.lote_codigo IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrar fotos de manejo_semanal para lote_fotos
INSERT INTO public.lote_fotos (lote_id, manejo_id, foto_url, tipo_foto, ordem_foto, created_at)
SELECT 
  ms.lote_id,
  ms.id as manejo_id,
  ms.foto_url,
  'manejo_semanal' as tipo_foto,
  1 as ordem_foto,
  ms.created_at
FROM public.manejo_semanal ms
WHERE ms.foto_url IS NOT NULL
  AND ms.foto_url != ''
ON CONFLICT DO NOTHING;