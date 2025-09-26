-- Criar função para buscar usuários com emails
CREATE OR REPLACE FUNCTION public.get_users_with_emails(status_filter text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  organization_code text,
  user_role user_role_enum,
  status approval_status,
  authorized_units text[],
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.organization_code,
    p.user_role,
    p.status,
    p.authorized_units,
    p.created_at,
    p.updated_at,
    p.approved_at,
    p.approved_by,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.user_id = au.id
  WHERE p.status = status_filter::approval_status
  ORDER BY 
    CASE 
      WHEN status_filter = 'approved' THEN p.approved_at 
      ELSE p.created_at 
    END DESC NULLS LAST;
$$;