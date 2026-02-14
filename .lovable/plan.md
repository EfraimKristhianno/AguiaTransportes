# Tabela de Precos de Frete por Cliente, Tipo de Transporte e Regiao

## Resumo

Criar uma tabela no banco de dados para armazenar precos de frete personalizados por cliente, e exibir esses valores no popover de informacoes do transporte (durante a solicitacao) e na lista de solicitacoes do Dashboard.

## Estrutura da Solucao

### 1. Nova tabela no banco: `freight_prices`


| Coluna         | Tipo                 | Descricao                          |
| -------------- | -------------------- | ---------------------------------- |
| id             | uuid (PK)            | Identificador                      |
| client_id      | uuid (FK -> clients) | Cliente vinculado                  |
| transport_type | text                 | Moto, Fiorino, etc.                |
| region         | text                 | Curitiba, Metropolitana, Araucaria |
| price          | numeric              | Valor do frete em R$               |
| created_at     | timestamptz          | Data de criacao                    |


RLS: leitura para usuarios autenticados (admin, gestor e o proprio cliente).

### 2. Dados a inserir

**Grupo padrao** (SVD Transportes, Associacao de Parkinson, Potenze Iluminacao, Buhler Group, Douprah):


| Transporte       | Curitiba | Metropolitana |
| ---------------- | -------- | ------------- |
| Moto             | 29,00    | 45,00         |
| Fiorino          | 85,00    | 95,00         |
| Caminhao (3/4)   | 470,00   | 470,00        |
| Caminhao (Truck) | 470,00   | 470,00        |


**Voga Vedabras:**


| Transporte       | Curitiba | Metropolitana |
| ---------------- | -------- | ------------- |
| Moto             | 29,00    | 45,00         |
| Fiorino          | 125,00   | 145,00        |
| Caminhao (3/4)   | 470,00   | 470,00        |
| Caminhao (Truck) | 470,00   | 470,00        |


**Plona Equipamentos:**


| Transporte       | Curitiba | Metropolitana | Araucaria |
| ---------------- | -------- | ------------- | --------- |
| Moto             | 26,00    | 45,00         | 30,00     |
| Fiorino          | 81,00    | 95,00         | 80,00     |
| Caminhao (3/4)   | 320,00   | 320,00        | -         |
| Caminhao (Truck) | 320,00   | 320,00        | -         |


### 3. Alteracoes no Frontend

**VehicleDetailsPopover.tsx:**

- Aceitar nova prop `clientId` (opcional)
- Buscar precos da tabela `freight_prices` filtrados por `client_id` e `transport_type`
- Exibir seção "Valores do Frete" no popover, listando cada regiao e valor formatado em R$

**RequestForm.tsx:**

- Passar o `clientId` (do cliente selecionado ou do clientRecord) para o `VehicleDetailsPopover`
- Quando o cliente mudar, o popover refaz a consulta de precos

**Dashboard.tsx:**

- Adicionar coluna/campo "Valor" na tabela e nos cards mobile
- Buscar precos da `freight_prices` para cada solicitacao com base no `client_id` e `transport_type`
- Exibir o valor formatado (ex: "Curitiba - R$ 85,00  / Metropolitana - R$ 95,00 ")
- Hook auxiliar `useFreightPrices` para buscar todos os precos de uma vez e fazer lookup local

### 4. Visibilidade por perfil

- Admin e Gestor: veem todos os precos
- Cliente: ve apenas seus proprios precos (RLS filtra por client_id)
- Motorista: nao ve precos (nao e requisito)

---

## Detalhes Tecnicos

### Migracao SQL

```text
CREATE TABLE freight_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  transport_type text NOT NULL,
  region text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, transport_type, region)
);

ALTER TABLE freight_prices ENABLE ROW LEVEL SECURITY;

-- Admins e gestores veem tudo
CREATE POLICY "Admins and gestores can manage freight_prices"
  ON freight_prices FOR ALL TO authenticated
  USING (is_admin_or_gestor())
  WITH CHECK (is_admin_or_gestor());

-- Clientes veem seus proprios precos
CREATE POLICY "Clients can view own freight_prices"
  ON freight_prices FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  ));

-- INSERT de todos os precos (cerca de 30 linhas)
```

### Novo hook: `useFreightPrices.ts`

- Recebe `clientId` opcional
- Retorna array de `{ transport_type, region, price }`
- Usado tanto no popover quanto no Dashboard

### Arquivos modificados


| Arquivo                                       | Mudanca                                           |
| --------------------------------------------- | ------------------------------------------------- |
| Migracao SQL                                  | Criar tabela + inserir dados + RLS                |
| `src/hooks/useFreightPrices.ts`               | Novo hook para buscar precos                      |
| `src/components/VehicleDetailsPopover.tsx`    | Adicionar prop `clientId`, buscar e exibir precos |
| `src/components/solicitacoes/RequestForm.tsx` | Passar `clientId` ao popover                      |
| `src/pages/Dashboard.tsx`                     | Exibir coluna de valor do frete na tabela e cards |
