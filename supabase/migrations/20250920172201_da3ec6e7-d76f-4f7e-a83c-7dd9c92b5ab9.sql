-- Corrigir a função de migração para usar tipo_foto válido
DROP FUNCTION IF EXISTS public.migrar_fotos_manejo_para_lote_fotos();

CREATE OR REPLACE FUNCTION public.migrar_fotos_manejo_para_lote_fotos()
RETURNS TABLE (
  migradas integer,
  ja_existentes integer,
  total_processadas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  registro_manejo RECORD;
  foto_existente_id uuid;
  migradas_count integer := 0;
  ja_existentes_count integer := 0;
BEGIN
  -- Iterar sobre todos os registros de manejo_semanal que têm foto_url
  FOR registro_manejo IN 
    SELECT 
      id, 
      lote_id, 
      foto_url, 
      created_at,
      observacoes
    FROM manejo_semanal 
    WHERE foto_url IS NOT NULL 
      AND deleted_at IS NULL
      AND lote_id IS NOT NULL
  LOOP
    -- Verificar se a foto já foi migrada
    SELECT id INTO foto_existente_id
    FROM lote_fotos
    WHERE manejo_id = registro_manejo.id
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- Se não existe, criar novo registro em lote_fotos
    IF foto_existente_id IS NULL THEN
      INSERT INTO lote_fotos (
        lote_id,
        manejo_id,
        foto_url,
        tipo_foto,
        created_at
      ) VALUES (
        registro_manejo.lote_id,
        registro_manejo.id,
        registro_manejo.foto_url,
        'manejo_semanal',  -- Este valor já está permitido no constraint
        registro_manejo.created_at
      );
      
      migradas_count := migradas_count + 1;
    ELSE
      ja_existentes_count := ja_existentes_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT migradas_count, ja_existentes_count, migradas_count + ja_existentes_count;
END;
$$;

-- Executar migração das fotos
SELECT * FROM public.migrar_fotos_manejo_para_lote_fotos();