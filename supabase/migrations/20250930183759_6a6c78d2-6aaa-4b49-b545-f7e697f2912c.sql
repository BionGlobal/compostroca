-- Corrigir função recalc_peso_lote_by_codigo para incluir 35% de cepilho
CREATE OR REPLACE FUNCTION public.recalc_peso_lote_by_codigo(lote_codigo_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lote_record RECORD;
  peso_total_entregas numeric := 0;
  peso_com_cepilho numeric := 0;
BEGIN
  -- Buscar o lote ativo (caixa 1) pelo código
  SELECT id, codigo, caixa_atual, status
  INTO lote_record
  FROM lotes 
  WHERE codigo = lote_codigo_param 
    AND caixa_atual = 1 
    AND status IN ('ativo', 'em_processamento')
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- Se não encontrou lote ativo na caixa 1, sair
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular soma total das entregas do lote
  SELECT COALESCE(SUM(peso), 0)
  INTO peso_total_entregas
  FROM entregas 
  WHERE lote_codigo = lote_codigo_param 
    AND deleted_at IS NULL;
  
  -- Adicionar 35% de cepilho ao peso das entregas
  peso_com_cepilho := peso_total_entregas * 1.35;
  
  -- Atualizar peso_atual do lote com o peso total incluindo cepilho
  UPDATE lotes 
  SET peso_atual = peso_com_cepilho,
      peso_inicial = peso_com_cepilho,
      updated_at = now()
  WHERE id = lote_record.id;
  
  RAISE LOG 'Peso do lote % recalculado: entregas=% kg, com cepilho=% kg', 
    lote_codigo_param, peso_total_entregas, peso_com_cepilho;
END;
$function$;

-- Corrigir o lote CWB001-26092025A582 especificamente
UPDATE lotes 
SET peso_atual = 66.798,
    peso_inicial = 66.798,
    updated_at = now()
WHERE codigo = 'CWB001-26092025A582' 
  AND deleted_at IS NULL;