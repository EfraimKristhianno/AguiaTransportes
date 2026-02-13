
-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventiva', 'corretiva', 'preditiva')),
  vehicle_plate TEXT NOT NULL,
  current_km NUMERIC NOT NULL,
  service_cost NUMERIC DEFAULT 0,
  notes TEXT,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can insert own maintenance_records"
  ON public.maintenance_records FOR INSERT
  WITH CHECK (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can view own maintenance_records"
  ON public.maintenance_records FOR SELECT
  USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Admins and gestores can view all maintenance_records"
  ON public.maintenance_records FOR SELECT
  USING (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can insert maintenance_records"
  ON public.maintenance_records FOR INSERT
  WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can update maintenance_records"
  ON public.maintenance_records FOR UPDATE
  USING (is_admin_or_gestor())
  WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins can delete maintenance_records"
  ON public.maintenance_records FOR DELETE
  USING (is_admin());

-- Updated_at trigger
CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
