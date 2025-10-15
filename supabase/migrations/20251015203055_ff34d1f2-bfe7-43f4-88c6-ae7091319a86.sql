-- Fase 1: Garantir codigo_unico desde criação do lote

-- 1.1. Criar função para gerar codigo_unico
CREATE OR REPLACE FUNCTION public.generate_codigo_unico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  date_part TEXT;
  line_part TEXT;
  seq_num INTEGER;
  new_codigo TEXT;
BEGIN
  -- Só gerar se não existir
  IF NEW.codigo_unico IS NULL OR NEW.codigo_unico = '' THEN
    -- Formatar data como DDMMYYYY
    date_part := to_char(NEW.data_inicio, 'DDMMYYYY');
    line_part := NEW.linha_producao;
    
    -- Contar lotes do mesmo dia e unidade para gerar sequencial
    SELECT COUNT(*) + 1 INTO seq_num
    FROM lotes
    WHERE to_char(data_inicio, 'DDMMYYYY') = date_part
      AND unidade = NEW.unidade
      AND deleted_at IS NULL;
    
    -- Formato: CWB001-28082025A001
    new_codigo := NEW.unidade || '-' || date_part || line_part || LPAD(seq_num::TEXT, 3, '0');
    NEW.codigo_unico := new_codigo;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.2. Criar trigger para aplicar a função antes de inserir
DROP TRIGGER IF EXISTS trigger_generate_codigo_unico ON public.lotes;
CREATE TRIGGER trigger_generate_codigo_unico
  BEFORE INSERT ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_codigo_unico();

-- 1.3. Atualizar lotes existentes sem codigo_unico
UPDATE public.lotes
SET codigo_unico = (
  unidade || '-' || 
  to_char(data_inicio, 'DDMMYYYY') || 
  linha_producao || 
  LPAD(
    (
      SELECT COUNT(*) + 1
      FROM lotes l2
      WHERE to_char(l2.data_inicio, 'DDMMYYYY') = to_char(lotes.data_inicio, 'DDMMYYYY')
        AND l2.unidade = lotes.unidade
        AND l2.id <= lotes.id
        AND l2.deleted_at IS NULL
    )::TEXT, 
    3, 
    '0'
  )
)
WHERE codigo_unico IS NULL OR codigo_unico = '';