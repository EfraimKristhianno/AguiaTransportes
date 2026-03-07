
CREATE TABLE public.address_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  used_count integer NOT NULL DEFAULT 1,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX address_history_address_unique ON public.address_history (lower(address));

ALTER TABLE public.address_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view address history"
  ON public.address_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert address history"
  ON public.address_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update address history"
  ON public.address_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
