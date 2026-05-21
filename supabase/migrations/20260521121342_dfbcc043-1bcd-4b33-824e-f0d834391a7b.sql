
-- 1) Soft-delete fotos replicadas no lote vazio
UPDATE public.lote_fotos
SET deleted_at = now()
WHERE lote_id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND deleted_at IS NULL;

-- 2) Soft-delete eventos do lote vazio (etapa 1 inicio + etapa 2 transferência)
UPDATE public.lote_eventos
SET deleted_at = now()
WHERE lote_id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND deleted_at IS NULL;

-- 3) Soft-delete do lote-fantasma (com guarda: só se peso_inicial = 0)
UPDATE public.lotes
SET deleted_at = now(), updated_at = now()
WHERE id = 'c8306250-e62e-46bd-ab22-200e8b565f23'
  AND COALESCE(peso_inicial, 0) = 0;

-- 4) Prevenção: bloquear transferência de lote vazio da caixa 1 → 2
CREATE OR REPLACE FUNCTION public.validar_transferencia_lote_vazio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_entregas integer;
BEGIN
  IF OLD.caixa_atual = 1 AND NEW.caixa_atual = 2 THEN
    SELECT COUNT(*) INTO total_entregas
    FROM public.entregas
    WHERE lote_codigo = NEW.codigo
      AND deleted_at IS NULL;

    IF total_entregas = 0 OR COALESCE(NEW.peso_atual, 0) = 0 THEN
      RAISE EXCEPTION
        'Lote % não pode ser transferido da Caixa 1 sem entregas (peso_atual=%, entregas=%)',
        NEW.codigo, NEW.peso_atual, total_entregas
        USING HINT = 'Registre entregas antes de avançar este lote no manejo semanal, ou exclua-o se foi criado por engano.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_transferencia_lote_vazio ON public.lotes;

CREATE TRIGGER trg_validar_transferencia_lote_vazio
  BEFORE UPDATE OF caixa_atual ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_transferencia_lote_vazio();
