-- Corrigir o lote CWB001-31072025A001
-- 1. Criar registros faltantes em lote_fotos para manejos sem associação
INSERT INTO lote_fotos (lote_id, manejo_id, foto_url, tipo_foto, ordem_foto)
SELECT 
  ms.lote_id,
  ms.id,
  ms.foto_url,
  'manejo_semanal',
  ROW_NUMBER() OVER (PARTITION BY ms.lote_id ORDER BY ms.created_at)
FROM manejo_semanal ms
LEFT JOIN lotes l ON l.id = ms.lote_id
LEFT JOIN lote_fotos lf ON lf.manejo_id = ms.id
WHERE l.codigo = 'CWB001-31072025A001'
  AND ms.foto_url IS NOT NULL
  AND lf.id IS NULL;

-- 2. Gerar hash de integridade para o lote
-- Será feito via código após a implementação do hook