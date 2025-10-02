-- Corrigir data de encerramento do lote CWB001-14082025A769
-- Atualizar para a data de hoje (01/10/2025) para que apareça primeiro no histórico

UPDATE lotes 
SET 
  data_encerramento = '2025-10-01 12:00:00+00'::timestamp with time zone,
  data_finalizacao = '2025-10-01 12:00:00+00'::timestamp with time zone,
  updated_at = now()
WHERE codigo = 'CWB001-14082025A769'
  AND status = 'encerrado';