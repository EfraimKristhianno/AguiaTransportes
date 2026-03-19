
-- Reatribuir solicitações para Buhler ML (com email)
UPDATE delivery_requests 
SET client_id = '6a68e64b-f2de-4685-8c4b-130e14dd610c'
WHERE request_number IN (105,104,103,102,99,95,94,93,90,89,88,87,86,85,84,71,70,69,68,66,65,64,54,53,52,50,49,48,47,46,45,44,43,41,39,38,37,36);

-- Reatribuir solicitações para Buhler CS
UPDATE delivery_requests 
SET client_id = '4befa167-2697-419f-a63c-68f78b237059'
WHERE request_number IN (32,33,34,40,51,63,67,97,100);

-- Reatribuir solicitações para Buhler Marketing
UPDATE delivery_requests 
SET client_id = 'b69645d5-f75f-4ec7-9f3f-6428c74c82f9'
WHERE request_number IN (35,72,91,92);

-- Remover o cliente duplicado Buhler ML (sem email)
DELETE FROM clients WHERE id = '3e663cae-6959-432f-947a-14916e6322de';
