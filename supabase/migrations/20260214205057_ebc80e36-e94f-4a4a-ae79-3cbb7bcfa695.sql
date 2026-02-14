
CREATE TABLE public.freight_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transport_type text NOT NULL,
  region text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, transport_type, region)
);

ALTER TABLE public.freight_prices ENABLE ROW LEVEL SECURITY;

-- Admins e gestores podem gerenciar todos os preços
CREATE POLICY "Admins and gestores can manage freight_prices"
  ON public.freight_prices FOR ALL TO authenticated
  USING (is_admin_or_gestor())
  WITH CHECK (is_admin_or_gestor());

-- Clientes podem ver seus próprios preços
CREATE POLICY "Clients can view own freight_prices"
  ON public.freight_prices FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  ));
