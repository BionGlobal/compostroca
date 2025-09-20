-- Fix security warnings by updating function search_path without dropping them
-- Use CREATE OR REPLACE to update existing functions in place

-- Fix handle_new_user function (recreate trigger since it needs to be done anyway)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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

-- Recreate the auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Fix log_user_activity function
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

-- Fix soft_delete_voluntario function
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

-- Fix update_updated_at_column function
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