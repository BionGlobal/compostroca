
-- Criar função helper para verificar se é admin (super ou local)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = is_admin.user_id
    AND user_role IN ('super_admin', 'local_admin')
    AND status = 'approved'
  );
$$;

-- Policy para local_admin poder fazer UPDATE em profiles de não-super_admins
CREATE POLICY "Local admins can update non-super-admin profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin() AND
  (SELECT user_role FROM public.profiles WHERE profiles.user_id = profiles.user_id AND profiles.id = profiles.id) != 'super_admin'
)
WITH CHECK (
  is_admin() AND
  user_role != 'super_admin'
);

-- Permitir local_admin ver todos os profiles (necessário para gerenciamento)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- Permitir local_admin ver activity logs
CREATE POLICY "Admins can view activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (is_admin());
