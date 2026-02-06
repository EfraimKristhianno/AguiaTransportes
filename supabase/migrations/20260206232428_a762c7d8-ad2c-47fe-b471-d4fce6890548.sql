
-- Tabela de historico
CREATE TABLE public.delivery_request_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_request_id uuid NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- RLS
ALTER TABLE public.delivery_request_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestores can view all history"
  ON delivery_request_status_history FOR SELECT
  USING (is_admin_or_gestor());

CREATE POLICY "Clients can view own request history"
  ON delivery_request_status_history FOR SELECT
  USING (delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN clients c ON dr.client_id = c.id
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  ));

CREATE POLICY "Drivers can view assigned request history"
  ON delivery_request_status_history FOR SELECT
  USING (delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN drivers d ON dr.driver_id = d.id
    WHERE d.user_id = auth.uid()
  ));

-- Deny anon
CREATE POLICY "Deny unauthenticated access to history"
  ON delivery_request_status_history FOR SELECT
  TO anon
  USING (false);

-- Trigger para registrar mudancas automaticamente
CREATE OR REPLACE FUNCTION public.log_delivery_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO delivery_request_status_history (delivery_request_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delivery_status_change
AFTER INSERT OR UPDATE ON delivery_requests
FOR EACH ROW EXECUTE FUNCTION public.log_delivery_status_change();

-- Popular historico com dados existentes
INSERT INTO delivery_request_status_history (delivery_request_id, status, changed_at)
SELECT id, status, created_at FROM delivery_requests;
