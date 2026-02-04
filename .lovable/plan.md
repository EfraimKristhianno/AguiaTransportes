
# Plano: Criar Tabelas no Supabase

## Resumo

O projeto precisa de várias tabelas no banco de dados Supabase para funcionar corretamente. Atualmente, o código tenta acessar tabelas que não existem (`users`, `user_roles`, `drivers`, `vehicles`, `clients`, `material_types`, `delivery_requests`), causando erros 404.

## Tabelas a Criar

| Tabela | Descrição |
|--------|-----------|
| `users` | Perfis dos usuários vinculados ao `auth.users` |
| `user_roles` | Perfis de acesso (admin, gestor, motorista, cliente) |
| `clients` | Cadastro de clientes |
| `drivers` | Cadastro de motoristas |
| `vehicles` | Cadastro de veículos |
| `material_types` | Tipos de materiais para transporte |
| `delivery_requests` | Solicitações de coleta/entrega |

## Fluxo de Relacionamentos

```text
auth.users
    │
    ├── users (auth_id → auth.users.id)
    │       └── user_roles (user_id → auth.users.id)
    │
    ├── drivers (user_id → auth.users.id, opcional)
    │       └── vehicle_id → vehicles.id
    │
    └── delivery_requests
            ├── client_id → clients.id
            ├── driver_id → drivers.id
            ├── vehicle_id → vehicles.id
            └── material_type_id → material_types.id
```

## Detalhes Técnicos

### 1. Enum e Funções de Segurança

Criar o enum `app_role` e funções `security definer` para evitar recursão infinita nas políticas RLS:

- `app_role`: admin, gestor, motorista, cliente
- `user_roles_count()`: conta total de roles (para detectar primeiro usuário)
- `has_role(user_id, role)`: verifica se usuário tem determinado role
- `is_admin()`: verifica se usuário atual é admin

### 2. Tabela `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| auth_id | uuid | FK para auth.users (NOT NULL, UNIQUE) |
| name | text | Nome completo |
| email | text | Email (UNIQUE) |
| phone | text | Telefone (opcional) |
| avatar_url | text | URL do avatar (opcional) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### 3. Tabela `user_roles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| user_id | uuid | FK para auth.users (NOT NULL, UNIQUE) |
| role | app_role | Perfil do usuário |
| created_at | timestamptz | Data de criação |

### 4. Tabela `clients`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| name | text | Nome/razão social |
| email | text | Email (opcional) |
| phone | text | Telefone (opcional) |
| document | text | CPF/CNPJ (opcional) |
| address | text | Endereço (opcional) |
| city | text | Cidade (opcional) |
| state | text | Estado (opcional) |
| zip_code | text | CEP (opcional) |
| notes | text | Observações (opcional) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### 5. Tabela `vehicles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| plate | text | Placa (UNIQUE) |
| type | text | Tipo (Moto, Carro, Van, Caminhão) |
| brand | text | Marca (opcional) |
| model | text | Modelo (opcional) |
| year | integer | Ano (opcional) |
| capacity | numeric | Capacidade em kg (opcional) |
| length | numeric | Comprimento em metros (opcional) |
| width | numeric | Largura em metros (opcional) |
| height | numeric | Altura em metros (opcional) |
| status | text | Status: active, maintenance, inactive |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### 6. Tabela `drivers`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| user_id | uuid | FK para auth.users (opcional) |
| name | text | Nome do motorista |
| phone | text | Telefone (opcional) |
| email | text | Email (opcional) |
| license_number | text | Número da CNH (opcional) |
| is_fixed | boolean | True = fixo, False = agregado |
| vehicle_id | uuid | FK para vehicles (opcional) |
| status | text | available, busy, offline |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### 7. Tabela `material_types`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| name | text | Nome do tipo de material |
| description | text | Descrição (opcional) |
| requires_special_handling | boolean | Requer manuseio especial |
| created_at | timestamptz | Data de criação |

### 8. Tabela `delivery_requests`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| client_id | uuid | FK para clients |
| driver_id | uuid | FK para drivers (opcional) |
| vehicle_id | uuid | FK para vehicles (opcional) |
| material_type_id | uuid | FK para material_types (opcional) |
| origin_address | text | Endereço de origem |
| destination_address | text | Endereço de destino |
| status | text | pending, accepted, in_progress, delivered, cancelled |
| scheduled_date | timestamptz | Data agendada (opcional) |
| delivered_at | timestamptz | Data de entrega (opcional) |
| notes | text | Observações (opcional) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### 9. Políticas RLS (Row Level Security)

Cada tabela terá RLS habilitado com políticas específicas:

**users e user_roles:**
- Primeiro usuário pode inserir (para bootstrap do admin)
- Usuários veem próprio perfil
- Admins gerenciam tudo

**clients, drivers, vehicles, material_types:**
- Usuários autenticados podem ler
- Admins e gestores podem inserir/atualizar/deletar

**delivery_requests:**
- Clientes veem próprias solicitações
- Motoristas veem solicitações atribuídas a eles
- Admins e gestores veem todas

## Implementação

1. Criar arquivo de migração SQL com todas as tabelas
2. Executar o SQL no Supabase via ferramenta de migração
3. Testar o fluxo de registro para confirmar que o primeiro usuário vira admin

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/0001_create_all_tables.sql` | Criar |

