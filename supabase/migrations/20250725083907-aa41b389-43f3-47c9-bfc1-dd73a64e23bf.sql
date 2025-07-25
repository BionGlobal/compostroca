-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  organization_code TEXT NOT NULL DEFAULT 'CWB001',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add user_id to voluntarios table
ALTER TABLE public.voluntarios 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id to entregas table  
ALTER TABLE public.entregas
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for voluntarios - REMOVE existing overly permissive ones
DROP POLICY IF EXISTS "Voluntarios are viewable by everyone" ON public.voluntarios;
DROP POLICY IF EXISTS "Voluntarios can be inserted by everyone" ON public.voluntarios;
DROP POLICY IF EXISTS "Voluntarios can be updated by everyone" ON public.voluntarios;
DROP POLICY IF EXISTS "Voluntarios can be deleted by everyone" ON public.voluntarios;

-- Create secure RLS policies for voluntarios
CREATE POLICY "Authenticated users can view voluntarios from their organization" 
ON public.voluntarios 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = voluntarios.unidade
  )
);

CREATE POLICY "Authenticated users can insert voluntarios in their organization" 
ON public.voluntarios 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = unidade
  )
);

CREATE POLICY "Authenticated users can update voluntarios in their organization" 
ON public.voluntarios 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = voluntarios.unidade
  )
);

CREATE POLICY "Authenticated users can delete voluntarios in their organization" 
ON public.voluntarios 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.organization_code = voluntarios.unidade
  )
);

-- Update RLS policies for entregas - REMOVE existing overly permissive ones
DROP POLICY IF EXISTS "Entregas are viewable by everyone" ON public.entregas;
DROP POLICY IF EXISTS "Entregas can be inserted by everyone" ON public.entregas;
DROP POLICY IF EXISTS "Entregas can be updated by everyone" ON public.entregas;

-- Create secure RLS policies for entregas
CREATE POLICY "Authenticated users can view entregas from their organization" 
ON public.entregas 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.voluntarios v
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE v.id = entregas.voluntario_id 
    AND p.organization_code = v.unidade
  )
);

CREATE POLICY "Authenticated users can insert entregas" 
ON public.entregas 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.voluntarios v
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE v.id = voluntario_id 
    AND p.organization_code = v.unidade
  )
);

CREATE POLICY "Authenticated users can update entregas from their organization" 
ON public.entregas 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.voluntarios v
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE v.id = entregas.voluntario_id 
    AND p.organization_code = v.unidade
  )
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for volunteer photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('volunteer-photos', 'volunteer-photos', false);

-- Storage policies for volunteer photos
CREATE POLICY "Authenticated users can view photos from their organization"
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'volunteer-photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'volunteer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update their photos"
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'volunteer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete their photos"
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'volunteer-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);