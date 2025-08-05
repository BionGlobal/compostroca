-- Sistema de Autorização Hierárquica com Aprovação de Usuários

-- 1. Criar enum para níveis de usuário
CREATE TYPE public.user_role_enum AS ENUM ('super_admin', 'local_admin', 'auditor');

-- 2. Criar enum para status de aprovação
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. Adicionar colunas à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN user_role user_role_enum NOT NULL DEFAULT 'local_admin',
ADD COLUMN status approval_status NOT NULL DEFAULT 'pending',
ADD COLUMN authorized_units text[] DEFAULT ARRAY['CWB001'],
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone;

-- 4. Atualizar admin@bionglobal.net para super administrador aprovado
UPDATE public.profiles 
SET user_role = 'super_admin', 
    status = 'approved',
    authorized_units = ARRAY['CWB001'],
    approved_at = now()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@bionglobal.net'
);

-- 5. Função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_super_admin.user_id 
    AND user_role = 'super_admin' 
    AND status = 'approved'
  );
$$;

-- 6. Função para verificar se usuário tem acesso a uma unidade
CREATE OR REPLACE FUNCTION public.has_unit_access(unit_code text, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = has_unit_access.user_id 
    AND status = 'approved'
    AND (user_role = 'super_admin' OR unit_code = ANY(authorized_units))
  );
$$;

-- 7. Função para verificar se usuário pode modificar dados
CREATE OR REPLACE FUNCTION public.can_modify_data(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = can_modify_data.user_id 
    AND status = 'approved'
    AND user_role IN ('super_admin', 'local_admin')
  );
$$;

-- 8. Atualizar RLS policies para lotes
DROP POLICY IF EXISTS "Usuários podem ver lotes da própria organização" ON public.lotes;
DROP POLICY IF EXISTS "Usuários podem criar lotes na própria organização" ON public.lotes;
DROP POLICY IF EXISTS "Usuários podem atualizar lotes da própria organização" ON public.lotes;

CREATE POLICY "Approved users can view lotes from authorized units" 
ON public.lotes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND status = 'approved'
    AND has_unit_access(lotes.unidade)
  )
);

CREATE POLICY "Approved local/super admins can create lotes" 
ON public.lotes FOR INSERT 
WITH CHECK (
  auth.uid() = criado_por 
  AND can_modify_data() 
  AND has_unit_access(unidade)
);

CREATE POLICY "Approved local/super admins can update lotes" 
ON public.lotes FOR UPDATE 
USING (
  can_modify_data() 
  AND has_unit_access(unidade)
);

-- 9. Atualizar RLS policies para voluntários
DROP POLICY IF EXISTS "Authenticated users can view voluntarios from their organizatio" ON public.voluntarios;
DROP POLICY IF EXISTS "Authenticated users can insert voluntarios in their organizatio" ON public.voluntarios;
DROP POLICY IF EXISTS "Authenticated users can update voluntarios in their organizatio" ON public.voluntarios;
DROP POLICY IF EXISTS "Authenticated users can delete voluntarios in their organizatio" ON public.voluntarios;

CREATE POLICY "Approved users can view voluntarios from authorized units" 
ON public.voluntarios FOR SELECT 
USING (has_unit_access(unidade));

CREATE POLICY "Approved local/super admins can insert voluntarios" 
ON public.voluntarios FOR INSERT 
WITH CHECK (
  can_modify_data() 
  AND has_unit_access(unidade)
  AND auth.uid() = user_id
);

CREATE POLICY "Approved local/super admins can update voluntarios" 
ON public.voluntarios FOR UPDATE 
USING (
  can_modify_data() 
  AND has_unit_access(unidade)
);

CREATE POLICY "Approved local/super admins can delete voluntarios" 
ON public.voluntarios FOR DELETE 
USING (
  can_modify_data() 
  AND has_unit_access(unidade)
);

-- 10. Atualizar RLS policies para entregas
DROP POLICY IF EXISTS "Authenticated users can view entregas from their organization" ON public.entregas;
DROP POLICY IF EXISTS "Authenticated users can insert entregas" ON public.entregas;
DROP POLICY IF EXISTS "Authenticated users can update entregas from their organization" ON public.entregas;

CREATE POLICY "Approved users can view entregas from authorized units" 
ON public.entregas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM voluntarios v
    WHERE v.id = entregas.voluntario_id 
    AND has_unit_access(v.unidade)
  )
);

CREATE POLICY "Approved local/super admins can insert entregas" 
ON public.entregas FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND can_modify_data()
  AND EXISTS (
    SELECT 1 FROM voluntarios v
    WHERE v.id = entregas.voluntario_id 
    AND has_unit_access(v.unidade)
  )
);

CREATE POLICY "Approved local/super admins can update entregas" 
ON public.entregas FOR UPDATE 
USING (
  can_modify_data()
  AND EXISTS (
    SELECT 1 FROM voluntarios v
    WHERE v.id = entregas.voluntario_id 
    AND has_unit_access(v.unidade)
  )
);

-- 11. Atualizar RLS policies para manejo_semanal
DROP POLICY IF EXISTS "Users can view manejo from their organization" ON public.manejo_semanal;
DROP POLICY IF EXISTS "Users can insert manejo in their organization" ON public.manejo_semanal;
DROP POLICY IF EXISTS "Users can update manejo from their organization" ON public.manejo_semanal;

CREATE POLICY "Approved users can view manejo from authorized units" 
ON public.manejo_semanal FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.id = manejo_semanal.lote_id 
    AND has_unit_access(l.unidade)
  )
);

CREATE POLICY "Approved local/super admins can insert manejo" 
ON public.manejo_semanal FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND can_modify_data()
  AND EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.id = manejo_semanal.lote_id 
    AND has_unit_access(l.unidade)
  )
);

CREATE POLICY "Approved local/super admins can update manejo" 
ON public.manejo_semanal FOR UPDATE 
USING (
  can_modify_data()
  AND EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.id = manejo_semanal.lote_id 
    AND has_unit_access(l.unidade)
  )
);

-- 12. Atualizar RLS policies para entrega_fotos
DROP POLICY IF EXISTS "Users can view photos from their organization" ON public.entrega_fotos;
DROP POLICY IF EXISTS "Users can insert photos from their organization" ON public.entrega_fotos;
DROP POLICY IF EXISTS "Users can update photos from their organization" ON public.entrega_fotos;
DROP POLICY IF EXISTS "Users can delete photos from their organization" ON public.entrega_fotos;

CREATE POLICY "Approved users can view entrega photos from authorized units" 
ON public.entrega_fotos FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM entregas e
    JOIN voluntarios v ON v.id = e.voluntario_id
    WHERE e.id = entrega_fotos.entrega_id 
    AND has_unit_access(v.unidade)
  )
);

CREATE POLICY "Approved local/super admins can insert entrega photos" 
ON public.entrega_fotos FOR INSERT 
WITH CHECK (
  can_modify_data()
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN voluntarios v ON v.id = e.voluntario_id
    WHERE e.id = entrega_fotos.entrega_id 
    AND has_unit_access(v.unidade)
  )
);

CREATE POLICY "Approved local/super admins can update entrega photos" 
ON public.entrega_fotos FOR UPDATE 
USING (
  can_modify_data()
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN voluntarios v ON v.id = e.voluntario_id
    WHERE e.id = entrega_fotos.entrega_id 
    AND has_unit_access(v.unidade)
  )
);

CREATE POLICY "Approved local/super admins can delete entrega photos" 
ON public.entrega_fotos FOR DELETE 
USING (
  can_modify_data()
  AND EXISTS (
    SELECT 1 FROM entregas e
    JOIN voluntarios v ON v.id = e.voluntario_id
    WHERE e.id = entrega_fotos.entrega_id 
    AND has_unit_access(v.unidade)
  )
);

-- 13. Criar política para super admins gerenciarem todos os perfis
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_super_admin()
);

CREATE POLICY "Super admins can update user status and roles" 
ON public.profiles FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR is_super_admin()
);