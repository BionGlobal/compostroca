-- Fix security warnings by adding proper search_path to existing functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.soft_delete_voluntario();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, organization_code, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'CWB001',
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action_type text, p_action_description text, p_table_affected text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id,
    action_type,
    action_description,
    table_affected,
    record_id
  ) VALUES (
    p_user_id,
    p_action_type,
    p_action_description,
    p_table_affected,
    p_record_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_voluntario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Em vez de deletar, apenas marca como deletado
    UPDATE voluntarios
    SET deleted_at = NOW()
    WHERE id = OLD.id;

    -- Evita a exclusão real
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;