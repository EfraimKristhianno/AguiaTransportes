-- Allow clients to insert their own client record (where email matches their auth email)
CREATE POLICY "Clients can insert own client record"
ON public.clients
FOR INSERT
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow clients to update their own client record
CREATE POLICY "Clients can update own client record"
ON public.clients
FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);