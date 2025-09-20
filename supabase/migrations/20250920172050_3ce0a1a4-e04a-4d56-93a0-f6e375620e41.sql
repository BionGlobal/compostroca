-- Criar função para migrar fotos de manejo_semanal para lote_fotos
-- Esta função irá garantir que todas as fotos sejam unificadas em lote_fotos
-- sem perder dados existentes

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
        'manutencao_semanal',
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

-- Criar função para validar integridade dos dados de auditoria
CREATE OR REPLACE FUNCTION public.validar_integridade_auditoria_lote(lote_id_param uuid)
RETURNS TABLE (
  status text,
  total_fotos_entregas integer,
  total_fotos_manejo integer,
  total_fotos_lote_fotos integer,
  total_manejo_semanal integer,
  inconsistencias text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inconsistencias_array text[] := ARRAY[]::text[];
  fotos_entregas_count integer;
  fotos_manejo_count integer;
  fotos_lote_count integer;
  manejo_count integer;
  lote_existe boolean;
BEGIN
  -- Verificar se o lote existe
  SELECT EXISTS(SELECT 1 FROM lotes WHERE id = lote_id_param) INTO lote_existe;
  
  IF NOT lote_existe THEN
    RETURN QUERY SELECT 'ERRO'::text, 0, 0, 0, 0, ARRAY['Lote não encontrado']::text[];
    RETURN;
  END IF;
  
  -- Contar fotos de entregas
  SELECT COUNT(*) INTO fotos_entregas_count
  FROM entrega_fotos ef
  JOIN entregas e ON e.id = ef.entrega_id
  WHERE e.lote_id = lote_id_param AND ef.deleted_at IS NULL;
  
  -- Contar fotos de manejo (via manejo_semanal.foto_url)
  SELECT COUNT(*) INTO fotos_manejo_count
  FROM manejo_semanal ms
  WHERE ms.lote_id = lote_id_param 
    AND ms.foto_url IS NOT NULL 
    AND ms.deleted_at IS NULL;
  
  -- Contar fotos em lote_fotos
  SELECT COUNT(*) INTO fotos_lote_count
  FROM lote_fotos lf
  WHERE lf.lote_id = lote_id_param AND lf.deleted_at IS NULL;
  
  -- Contar registros de manejo semanal
  SELECT COUNT(*) INTO manejo_count
  FROM manejo_semanal ms
  WHERE ms.lote_id = lote_id_param AND ms.deleted_at IS NULL;
  
  -- Verificar inconsistências
  IF fotos_manejo_count > 0 AND fotos_lote_count = 0 THEN
    inconsistencias_array := array_append(inconsistencias_array, 'Fotos de manejo não migradas para lote_fotos');
  END IF;
  
  IF manejo_count = 0 THEN
    inconsistencias_array := array_append(inconsistencias_array, 'Nenhum registro de manejo semanal encontrado');
  END IF;
  
  -- Determinar status geral
  DECLARE
    status_geral text;
  BEGIN
    IF array_length(inconsistencias_array, 1) > 0 THEN
      status_geral := 'INCONSISTENTE';
    ELSE
      status_geral := 'OK';
    END IF;
    
    RETURN QUERY SELECT 
      status_geral, 
      fotos_entregas_count, 
      fotos_manejo_count, 
      fotos_lote_count, 
      manejo_count, 
      inconsistencias_array;
  END;
END;
$$;

-- Criar função para backup de dados críticos antes de migrações
CREATE OR REPLACE FUNCTION public.backup_dados_auditoria()
RETURNS TABLE (
  backup_id uuid,
  timestamp_backup timestamp with time zone,
  registros_manejo integer,
  registros_lote_fotos integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  backup_uuid uuid := gen_random_uuid();
  manejo_count integer;
  lote_fotos_count integer;
BEGIN
  -- Criar tabela de backup se não existir
  CREATE TABLE IF NOT EXISTS backup_auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id uuid NOT NULL,
    tabela_origem text NOT NULL,
    dados_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
  );
  
  -- Fazer backup dos dados de manejo_semanal
  INSERT INTO backup_auditoria (backup_id, tabela_origem, dados_json)
  SELECT 
    backup_uuid,
    'manejo_semanal',
    row_to_json(ms)::jsonb
  FROM manejo_semanal ms
  WHERE ms.deleted_at IS NULL;
  
  GET DIAGNOSTICS manejo_count = ROW_COUNT;
  
  -- Fazer backup dos dados de lote_fotos
  INSERT INTO backup_auditoria (backup_id, tabela_origem, dados_json)
  SELECT 
    backup_uuid,
    'lote_fotos',
    row_to_json(lf)::jsonb
  FROM lote_fotos lf
  WHERE lf.deleted_at IS NULL;
  
  GET DIAGNOSTICS lote_fotos_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    backup_uuid, 
    now(), 
    manejo_count, 
    lote_fotos_count;
END;
$$;

-- Executar migração inicial das fotos
SELECT * FROM public.migrar_fotos_manejo_para_lote_fotos();