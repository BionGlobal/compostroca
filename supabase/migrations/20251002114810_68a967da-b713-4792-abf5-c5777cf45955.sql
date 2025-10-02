-- Ajustar taxa de decaimento de 3,54% para 3,65% e recalcular todos os pesos
-- Nova taxa: 3,65% = fator multiplicador de 0,9635

-- 1. Atualizar regra_decaimento de todos os lotes
UPDATE lotes 
SET regra_decaimento = 0.0365
WHERE deleted_at IS NULL;

-- 2. Recalcular peso_atual dos lotes em processamento (ativo/em_processamento)
-- Fórmula: peso_atual = peso_inicial * (0.9635 ^ (semana_atual - 1))
UPDATE lotes
SET 
  peso_atual = ROUND(peso_inicial * POWER(0.9635, GREATEST(semana_atual - 1, 0)), 2),
  updated_at = now()
WHERE status IN ('ativo', 'em_processamento')
  AND deleted_at IS NULL;

-- 3. Recalcular peso_final dos lotes finalizados
-- Fórmula: peso_final = peso_inicial * (0.9635 ^ 7)
UPDATE lotes
SET 
  peso_final = ROUND(peso_inicial * POWER(0.9635, 7), 2),
  peso_atual = ROUND(peso_inicial * POWER(0.9635, 7), 2),
  updated_at = now()
WHERE status = 'encerrado'
  AND deleted_at IS NULL;

-- 4. Recalcular co2eq_evitado e creditos_cau dos lotes finalizados
-- Baseado no novo peso_final
UPDATE lotes
SET 
  co2eq_evitado = ROUND(peso_final * 0.766, 2),
  creditos_cau = ROUND(peso_final / 1000.0, 3),
  updated_at = now()
WHERE status = 'encerrado'
  AND deleted_at IS NULL
  AND peso_final IS NOT NULL;

-- 5. Atualizar função SQL calcular_peso_com_decaimento para usar nova taxa
CREATE OR REPLACE FUNCTION public.calcular_peso_com_decaimento(peso_anterior numeric, taxa_decaimento numeric DEFAULT 0.0365)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT ROUND(peso_anterior * (1 - taxa_decaimento), 2);
$function$;

-- 6. Recalcular peso_depois em eventos de transferência
-- Para eventos de transferência, recalcular o peso_depois baseado no peso_antes
UPDATE lote_eventos le
SET 
  peso_depois = ROUND(le.peso_antes * 0.9635, 2),
  updated_at = now()
WHERE le.tipo_evento = 'transferencia'
  AND le.deleted_at IS NULL
  AND le.peso_antes IS NOT NULL;