-- Apagar histórico de status primeiro (tem FK para delivery_requests)
DELETE FROM public.delivery_request_status_history;

-- Apagar solicitações
DELETE FROM public.delivery_requests;

-- Apagar registros de combustível
DELETE FROM public.vehicle_logs;

-- Apagar registros de troca de óleo
DELETE FROM public.oil_change_records;

-- Apagar registros de manutenção
DELETE FROM public.maintenance_records;