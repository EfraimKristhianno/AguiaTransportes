CREATE POLICY "Admins and gestores can update status history"
ON public.delivery_request_status_history
FOR UPDATE
TO authenticated
USING (is_admin_or_gestor())
WITH CHECK (is_admin_or_gestor());