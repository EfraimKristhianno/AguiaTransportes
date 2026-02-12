
-- Table for vehicle fuel/km logs
CREATE TABLE public.vehicle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  km_initial numeric NOT NULL DEFAULT 0,
  km_final numeric NOT NULL DEFAULT 0,
  km_total numeric GENERATED ALWAYS AS (km_final - km_initial) STORED,
  liters numeric,
  fuel_price numeric,
  total_cost numeric,
  fuel_type text NOT NULL DEFAULT 'diesel' CHECK (fuel_type IN ('gasolina', 'alcool', 'diesel')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table for oil change records
CREATE TABLE public.oil_change_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  change_date date NOT NULL DEFAULT CURRENT_DATE,
  km_at_change numeric NOT NULL,
  next_change_km numeric NOT NULL,
  oil_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_change_records ENABLE ROW LEVEL SECURITY;

-- vehicle_logs RLS policies
CREATE POLICY "Admins and gestores can view all vehicle_logs"
ON public.vehicle_logs FOR SELECT
USING (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can insert vehicle_logs"
ON public.vehicle_logs FOR INSERT
WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can update vehicle_logs"
ON public.vehicle_logs FOR UPDATE
USING (is_admin_or_gestor())
WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins can delete vehicle_logs"
ON public.vehicle_logs FOR DELETE
USING (is_admin());

CREATE POLICY "Drivers can view own vehicle_logs"
ON public.vehicle_logs FOR SELECT
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can insert own vehicle_logs"
ON public.vehicle_logs FOR INSERT
WITH CHECK (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can update own vehicle_logs"
ON public.vehicle_logs FOR UPDATE
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- oil_change_records RLS policies
CREATE POLICY "Admins and gestores can view all oil_change_records"
ON public.oil_change_records FOR SELECT
USING (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can insert oil_change_records"
ON public.oil_change_records FOR INSERT
WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins can delete oil_change_records"
ON public.oil_change_records FOR DELETE
USING (is_admin());

CREATE POLICY "Drivers can view own oil_change_records"
ON public.oil_change_records FOR SELECT
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can insert own oil_change_records"
ON public.oil_change_records FOR INSERT
WITH CHECK (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Trigger for updated_at on vehicle_logs
CREATE TRIGGER update_vehicle_logs_updated_at
BEFORE UPDATE ON public.vehicle_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
