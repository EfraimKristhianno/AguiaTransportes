-- Insert vehicle types with their characteristics
-- Moto: 60cm x 60cm x 50cm, 25kg
INSERT INTO vehicles (plate, type, length, width, height, capacity, status)
VALUES ('TIPO-MOTO', 'Moto', 0.60, 0.60, 0.50, 25, 'active');

-- Fiorino: 1.60m x 1.10m x 1.45m, 450kg
INSERT INTO vehicles (plate, type, length, width, height, capacity, status)
VALUES ('TIPO-FIORINO', 'Fiorino', 1.60, 1.10, 1.45, 450, 'active');

-- Caminhão 3/4: 6.18m x 2.39m x 2.39m, 5000kg
INSERT INTO vehicles (plate, type, length, width, height, capacity, status)
VALUES ('TIPO-CAM34', 'Caminhão (3/4)', 6.18, 2.39, 2.39, 5000, 'active');

-- Caminhão Truck: 8.30m x 2.45m x 3.00m, 14000kg
INSERT INTO vehicles (plate, type, length, width, height, capacity, status)
VALUES ('TIPO-TRUCK', 'Caminhão (Truck)', 8.30, 2.45, 3.00, 14000, 'active');