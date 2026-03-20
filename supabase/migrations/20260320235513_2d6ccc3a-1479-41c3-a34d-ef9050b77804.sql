
-- Criar cliente Buhler Financeiro
INSERT INTO clients (name) VALUES ('Buhler Financeiro');

-- Atribuir solicitação #42 ao novo cliente
UPDATE delivery_requests 
SET client_id = (SELECT id FROM clients WHERE name = 'Buhler Financeiro' LIMIT 1)
WHERE request_number = 42;
