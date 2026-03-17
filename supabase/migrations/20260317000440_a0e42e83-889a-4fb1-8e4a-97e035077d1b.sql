
-- Create Buhler ML and Buhler CS clients
INSERT INTO clients (name) VALUES ('Buhler ML'), ('Buhler CS');

-- Insert freight prices for Buhler ML (same as Bühler Group)
INSERT INTO freight_prices (client_id, transport_type, region, price)
SELECT c.id, vals.transport_type, vals.region, vals.price
FROM clients c
CROSS JOIN (VALUES
  ('Moto', 'Curitiba', 29.00),
  ('Moto', 'Metropolitana', 45.00),
  ('Fiorino', 'Curitiba', 85.00),
  ('Fiorino', 'Metropolitana', 95.00),
  ('Caminhão (3/4)', 'Curitiba', 470.00),
  ('Caminhão (3/4)', 'Metropolitana', 470.00),
  ('Caminhão (Truck)', 'Curitiba', 470.00),
  ('Caminhão (Truck)', 'Metropolitana', 470.00)
) AS vals(transport_type, region, price)
WHERE c.name = 'Buhler ML';

-- Insert freight prices for Buhler CS (same as Bühler Group)
INSERT INTO freight_prices (client_id, transport_type, region, price)
SELECT c.id, vals.transport_type, vals.region, vals.price
FROM clients c
CROSS JOIN (VALUES
  ('Moto', 'Curitiba', 29.00),
  ('Moto', 'Metropolitana', 45.00),
  ('Fiorino', 'Curitiba', 85.00),
  ('Fiorino', 'Metropolitana', 95.00),
  ('Caminhão (3/4)', 'Curitiba', 470.00),
  ('Caminhão (3/4)', 'Metropolitana', 470.00),
  ('Caminhão (Truck)', 'Curitiba', 470.00),
  ('Caminhão (Truck)', 'Metropolitana', 470.00)
) AS vals(transport_type, region, price)
WHERE c.name = 'Buhler CS';
