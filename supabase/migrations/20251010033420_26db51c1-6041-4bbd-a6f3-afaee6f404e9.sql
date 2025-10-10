-- ========================================
-- TRIGGER: Prevenir Encerramento Indevido da Caixa 1
-- ========================================
-- Objetivo: Impedir que lotes na Caixa 1 sejam encerrados (data_encerramento != NULL)
-- se não houver entregas registradas
-- Isso protege contra encerramentos acidentais que bloqueiam o sistema de entregas

CREATE OR REPLACE FUNCTION public.validar_encerramento_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_entregas INTEGER;
BEGIN
  -- Verificar se está tentando encerrar lote na Caixa 1
  IF NEW.caixa_atual = 1 AND NEW.data_encerramento IS NOT NULL THEN
    -- Contar entregas do lote
    SELECT COUNT(*) INTO total_entregas
    FROM entregas
    WHERE lote_codigo = NEW.codigo
      AND deleted_at IS NULL;
    
    -- Se não houver entregas, bloquear encerramento
    IF total_entregas = 0 THEN
      RAISE EXCEPTION 'Não é possível encerrar lote % na Caixa 1 sem entregas registradas. Total de entregas: %', 
        NEW.codigo, total_entregas
      USING HINT = 'Registre entregas antes de encerrar o lote ou reative-o usando a função reativar-lote-entregas';
    END IF;
    
    -- Log de segurança
    RAISE NOTICE '✅ Encerramento de lote % validado: % entregas encontradas', NEW.codigo, total_entregas;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trigger_validar_encerramento_lote ON public.lotes;
CREATE TRIGGER trigger_validar_encerramento_lote
  BEFORE UPDATE ON public.lotes
  FOR EACH ROW
  WHEN (NEW.data_encerramento IS NOT NULL AND OLD.data_encerramento IS NULL)
  EXECUTE FUNCTION public.validar_encerramento_lote();

COMMENT ON FUNCTION public.validar_encerramento_lote() IS 
'Valida se um lote pode ser encerrado. Impede encerramento da Caixa 1 sem entregas.';

COMMENT ON TRIGGER trigger_validar_encerramento_lote ON public.lotes IS 
'Dispara validação antes de encerrar um lote para garantir integridade do sistema de entregas.';