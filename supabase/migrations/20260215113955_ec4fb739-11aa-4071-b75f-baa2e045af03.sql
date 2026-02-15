-- Limpar histórico de status primeiro (referência FK)
DELETE FROM delivery_request_status_history;

-- Limpar todas as solicitações
DELETE FROM delivery_requests;

-- Resetar a sequência do número de solicitação
ALTER SEQUENCE delivery_requests_request_number_seq RESTART WITH 1;