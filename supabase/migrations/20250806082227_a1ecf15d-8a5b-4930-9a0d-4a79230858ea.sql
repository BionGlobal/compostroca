-- Create user activity logs table
CREATE TABLE public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  table_affected text,
  record_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user activity logs
CREATE POLICY "Super admins can view all activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "System can insert activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- Function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_action_type text,
  p_action_description text,
  p_table_affected text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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