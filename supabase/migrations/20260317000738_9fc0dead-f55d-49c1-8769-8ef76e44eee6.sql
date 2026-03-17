
-- Update is_admin_or_gestor to also include assistente_logistico
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'gestor', 'assistente_logistico')
  );
$$;
