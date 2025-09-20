-- Fix remaining function search_path warnings for the three functions without search_path set

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_super_admin.user_id 
    AND user_role = 'super_admin' 
    AND status = 'approved'
  );
$$;

-- Fix has_unit_access function  
CREATE OR REPLACE FUNCTION public.has_unit_access(unit_code text, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = has_unit_access.user_id 
    AND status = 'approved'
    AND (user_role = 'super_admin' OR unit_code = ANY(authorized_units))
  );
$$;

-- Fix can_modify_data function
CREATE OR REPLACE FUNCTION public.can_modify_data(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = can_modify_data.user_id 
    AND status = 'approved'
    AND user_role IN ('super_admin', 'local_admin')
  );
$$;