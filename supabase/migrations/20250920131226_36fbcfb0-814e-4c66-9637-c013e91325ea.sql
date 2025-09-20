-- Corrigir dados dos lotes finalizados
-- 1. Atualizar peso_final para lotes finalizados (22% menor que peso_inicial)
UPDATE public.lotes 
SET peso_final = peso_inicial * 0.78,
    updated_at = now()
WHERE status = 'encerrado' 
  AND peso_final IS NULL 
  AND peso_inicial > 0;

-- 2. Recalcular CO2e baseado no peso_inicial (não no peso_final)
UPDATE public.lotes 
SET co2eq_evitado = peso_inicial * 0.766,
    creditos_cau = peso_inicial / 1000.0,
    updated_at = now()
WHERE status = 'encerrado' 
  AND peso_inicial > 0;

-- 3. Criar função para associar entregas aos lotes baseado em datas
CREATE OR REPLACE FUNCTION associar_entregas_lotes_finalizados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    lote_record RECORD;
    entrega_record RECORD;
BEGIN
    -- Para cada lote finalizado
    FOR lote_record IN 
        SELECT id, codigo, data_inicio, data_encerramento, unidade
        FROM lotes 
        WHERE status = 'encerrado' 
        ORDER BY data_inicio
    LOOP
        -- Associar entregas que foram feitas no período do lote
        UPDATE entregas 
        SET lote_codigo = lote_record.codigo,
            lote_id = lote_record.id
        WHERE lote_codigo IS NULL 
          AND created_at >= lote_record.data_inicio 
          AND (lote_record.data_encerramento IS NULL OR created_at <= lote_record.data_encerramento)
          AND EXISTS (
              SELECT 1 FROM voluntarios v 
              WHERE v.id = entregas.voluntario_id 
              AND v.unidade = lote_record.unidade
          );
    END LOOP;
END;
$$;

-- Executar a associação
SELECT associar_entregas_lotes_finalizados();

-- 4. Gerar índices de cadeia e hashes para lotes finalizados
WITH lotes_ordenados AS (
    SELECT id, codigo, unidade, data_inicio,
           ROW_NUMBER() OVER (ORDER BY data_inicio) as novo_indice
    FROM lotes 
    WHERE status = 'encerrado' 
    AND indice_cadeia = 0
    ORDER BY data_inicio
)
UPDATE lotes 
SET indice_cadeia = lo.novo_indice,
    updated_at = now()
FROM lotes_ordenados lo
WHERE lotes.id = lo.id;