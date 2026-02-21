-- Limpar histórico de status das solicitações
DELETE FROM delivery_request_status_history;

-- Limpar todas as solicitações de entrega
DELETE FROM delivery_requests;

-- Limpar registros de abastecimento
DELETE FROM vehicle_logs;

-- Limpar registros de troca de óleo
DELETE FROM oil_change_records;

-- Limpar registros de manutenção
DELETE FROM maintenance_records;