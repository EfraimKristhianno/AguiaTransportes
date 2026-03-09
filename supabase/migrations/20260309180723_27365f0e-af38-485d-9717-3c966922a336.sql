-- Allow gestors to also delete delivery_requests
DROP POLICY "Only admins can delete delivery_requests" ON public.delivery_requests;
CREATE POLICY "Admins and gestores can delete delivery_requests"
ON public.delivery_requests
FOR DELETE
TO authenticated
USING (is_admin_or_gestor());

-- Also allow deleting related status history
CREATE POLICY "Admins and gestores can delete status history"
ON public.delivery_request_status_history
FOR DELETE
TO authenticated
USING (is_admin_or_gestor());