-- FASE 1: Implementação de Soft Delete Universal
-- Adicionar deleted_at às tabelas principais

ALTER TABLE public.lotes ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.entregas ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.manejo_semanal ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz NULL;
ALTER TABLE public.entrega_fotos ADD COLUMN deleted_at timestamptz NULL;

-- FASE 2: Evolução da Tabela Lotes
-- Adicionar novos campos para ciclo de vida completo

ALTER TABLE public.lotes ADD COLUMN peso_final numeric NULL;
ALTER TABLE public.lotes ADD COLUMN data_finalizacao timestamptz NULL;
ALTER TABLE public.lotes ADD COLUMN iot_data jsonb NULL;

-- FASE 3: Nova Estrutura Unificada de Fotos
-- Criar tabela lote_fotos para centralizar gestão de fotos

CREATE TABLE public.lote_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES public.lotes(id) NOT NULL,
  entrega_id uuid REFERENCES public.entregas(id) NULL,
  manejo_id uuid REFERENCES public.manejo_semanal(id) NULL,
  foto_url text NOT NULL,
  tipo_foto text NOT NULL CHECK (tipo_foto IN ('entrega_conteudo', 'entrega_pesagem', 'entrega_destino', 'manejo_semanal')),
  ordem_foto integer NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL,
  deleted_at timestamptz NULL
);

-- Índices para performance
CREATE INDEX idx_lote_fotos_lote_id ON public.lote_fotos(lote_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lote_fotos_entrega_id ON public.lote_fotos(entrega_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lote_fotos_manejo_id ON public.lote_fotos(manejo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lote_fotos_tipo ON public.lote_fotos(tipo_foto) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_lote_fotos_updated_at
BEFORE UPDATE ON public.lote_fotos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- FASE 4: Políticas RLS para lote_fotos
-- Ativar RLS
ALTER TABLE public.lote_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas para lote_fotos
CREATE POLICY "Approved users can view lote photos from authorized units"
ON public.lote_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Approved local/super admins can insert lote photos"
ON public.lote_fotos
FOR INSERT
WITH CHECK (
  can_modify_data() 
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
);

CREATE POLICY "Approved local/super admins can update lote photos"
ON public.lote_fotos
FOR UPDATE
USING (
  can_modify_data() 
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- FASE 5: Atualizar políticas RLS existentes para incluir soft delete
-- Atualizar políticas de lotes
DROP POLICY IF EXISTS "Approved users can view lotes from authorized units" ON public.lotes;
CREATE POLICY "Approved users can view lotes from authorized units"
ON public.lotes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.status = 'approved'::approval_status
    AND has_unit_access(lotes.unidade)
  )
  AND deleted_at IS NULL
);

-- Atualizar políticas de entregas
DROP POLICY IF EXISTS "Approved users can view entregas from authorized units" ON public.entregas;
CREATE POLICY "Approved users can view entregas from authorized units"
ON public.entregas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voluntarios v
    WHERE v.id = entregas.voluntario_id
    AND has_unit_access(v.unidade)
    AND v.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Atualizar políticas de manejo_semanal
DROP POLICY IF EXISTS "Approved users can view manejo from authorized units" ON public.manejo_semanal;
CREATE POLICY "Approved users can view manejo from authorized units"
ON public.manejo_semanal
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = manejo_semanal.lote_id
    AND has_unit_access(l.unidade)
    AND l.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Atualizar políticas de entrega_fotos
DROP POLICY IF EXISTS "Approved users can view entrega photos from authorized units" ON public.entrega_fotos;
CREATE POLICY "Approved users can view entrega photos from authorized units"
ON public.entrega_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.entregas e
    JOIN public.voluntarios v ON v.id = e.voluntario_id
    WHERE e.id = entrega_fotos.entrega_id
    AND has_unit_access(v.unidade)
    AND e.deleted_at IS NULL
    AND v.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);

-- FASE 6: Funções de soft delete
-- Função genérica para soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_record(
  table_name text,
  record_id uuid,
  user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sql_query text;
  affected_rows integer;
BEGIN
  -- Validar que o usuário pode modificar dados
  IF NOT can_modify_data(user_id) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para deletar dados';
  END IF;

  -- Construir query dinamicamente
  sql_query := format(
    'UPDATE %I SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  );
  
  -- Executar o soft delete
  EXECUTE sql_query USING record_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log da atividade
  IF affected_rows > 0 THEN
    PERFORM log_user_activity(
      user_id,
      'soft_delete',
      format('Soft delete de registro em %s', table_name),
      table_name,
      record_id
    );
  END IF;
  
  RETURN affected_rows > 0;
END;
$$;

-- Função para restaurar registro soft deleted
CREATE OR REPLACE FUNCTION public.restore_soft_deleted_record(
  table_name text,
  record_id uuid,
  user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sql_query text;
  affected_rows integer;
BEGIN
  -- Validar que o usuário é super admin
  IF NOT is_super_admin(user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem restaurar registros deletados';
  END IF;

  -- Construir query dinamicamente
  sql_query := format(
    'UPDATE %I SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NOT NULL',
    table_name
  );
  
  -- Executar a restauração
  EXECUTE sql_query USING record_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log da atividade
  IF affected_rows > 0 THEN
    PERFORM log_user_activity(
      user_id,
      'restore',
      format('Restauração de registro em %s', table_name),
      table_name,
      record_id
    );
  END IF;
  
  RETURN affected_rows > 0;
END;
$$;

-- Migrar dados existentes da entrega_fotos para lote_fotos
INSERT INTO public.lote_fotos (lote_id, entrega_id, foto_url, tipo_foto, created_at)
SELECT 
  e.lote_codigo::uuid as lote_id,
  ef.entrega_id,
  ef.foto_url,
  CASE 
    WHEN ef.tipo_foto = 'conteudo' THEN 'entrega_conteudo'
    WHEN ef.tipo_foto = 'pesagem' THEN 'entrega_pesagem'
    WHEN ef.tipo_foto = 'destino' THEN 'entrega_destino'
    ELSE ef.tipo_foto
  END as tipo_foto,
  ef.created_at
FROM public.entrega_fotos ef
JOIN public.entregas e ON e.id = ef.entrega_id
WHERE ef.deleted_at IS NULL
  AND e.deleted_at IS NULL
  AND e.lote_codigo IS NOT NULL;

-- Migrar fotos de manejo_semanal para lote_fotos
INSERT INTO public.lote_fotos (lote_id, manejo_id, foto_url, tipo_foto, ordem_foto, created_at)
SELECT 
  ms.lote_id,
  ms.id as manejo_id,
  ms.foto_url,
  'manejo_semanal' as tipo_foto,
  1 as ordem_foto,
  ms.created_at
FROM public.manejo_semanal ms
WHERE ms.foto_url IS NOT NULL
  AND ms.deleted_at IS NULL;