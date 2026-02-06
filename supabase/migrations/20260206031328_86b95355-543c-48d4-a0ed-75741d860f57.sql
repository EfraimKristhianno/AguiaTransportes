-- Ajusta constraint de status para aceitar valores PT-BR (e manter valores legados em inglês)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'delivery_requests'
      AND c.conname = 'delivery_requests_status_check'
  ) THEN
    ALTER TABLE public.delivery_requests
      DROP CONSTRAINT delivery_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.delivery_requests
  ADD CONSTRAINT delivery_requests_status_check
  CHECK (
    status = ANY (
      ARRAY[
        -- PT-BR (app)
        'solicitada', 'aceita', 'coletada', 'em_rota', 'entregue', 'enviada', 'cancelada',
        -- EN (legado)
        'pending', 'accepted', 'in_progress', 'delivered', 'cancelled'
      ]
    )
  );
