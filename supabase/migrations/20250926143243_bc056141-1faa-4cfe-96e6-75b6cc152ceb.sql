-- Função para recalcular peso de lote baseado nas entregas
CREATE OR REPLACE FUNCTION public.recalc_peso_lote_by_codigo(lote_codigo_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lote_record RECORD;
  peso_total_entregas numeric := 0;
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
  
  -- Atualizar peso_atual do lote com a soma das entregas
  UPDATE lotes 
  SET peso_atual = peso_total_entregas,
      updated_at = now()
  WHERE id = lote_record.id;
  
  RAISE LOG 'Peso do lote % recalculado: % kg (soma de entregas)', lote_codigo_param, peso_total_entregas;
END;
$function$;

-- Trigger para recalcular peso automaticamente quando entregas mudarem
CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_entregas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Para INSERT e UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Se tem lote_codigo, recalcular
    IF NEW.lote_codigo IS NOT NULL THEN
      PERFORM public.recalc_peso_lote_by_codigo(NEW.lote_codigo);
    END IF;
    
    -- Se estava associado a outro lote antes (UPDATE), recalcular o anterior também
    IF TG_OP = 'UPDATE' AND OLD.lote_codigo IS NOT NULL AND OLD.lote_codigo != NEW.lote_codigo THEN
      PERFORM public.recalc_peso_lote_by_codigo(OLD.lote_codigo);
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.lote_codigo IS NOT NULL THEN
      PERFORM public.recalc_peso_lote_by_codigo(OLD.lote_codigo);
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Criar trigger na tabela entregas
DROP TRIGGER IF EXISTS tr_recalc_peso_entregas ON entregas;
CREATE TRIGGER tr_recalc_peso_entregas
  AFTER INSERT OR UPDATE OR DELETE
  ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_peso_entregas();

-- Corrigir imediatamente o lote problemático CWB001-26092025A582
SELECT public.recalc_peso_lote_by_codigo('CWB001-26092025A582');