-- Renomear "Caminhão (Truck)" para "Caminhão" em todas as tabelas
UPDATE freight_prices SET transport_type = 'Caminhão' WHERE transport_type = 'Caminhão (Truck)';
UPDATE vehicles SET type = 'Caminhão' WHERE type = 'Caminhão (Truck)';
UPDATE driver_vehicle_types SET vehicle_type = 'Caminhão' WHERE vehicle_type = 'Caminhão (Truck)';
UPDATE delivery_requests SET transport_type = 'Caminhão' WHERE transport_type = 'Caminhão (Truck)';