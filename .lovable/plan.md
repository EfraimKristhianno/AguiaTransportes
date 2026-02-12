

# Corrigir Politica RLS da Tabela `clients`

## Problema
A tabela `clients` contém dados pessoais sensíveis (email, telefone, endereço, CPF/CNPJ) e atualmente possui uma política de SELECT que permite que **qualquer usuário autenticado** veja **todos** os registros de clientes. Isso significa que motoristas e outros clientes podem acessar informações pessoais de todos os clientes.

## Solução

Executar uma migração SQL que:

1. **Remove** a política permissiva `"Authenticated users can view clients"` (que usa `USING (true)`)
2. **Cria** uma nova política `"Admins and gestores can view all clients"` restrita a admins e gestores usando a função `is_admin_or_gestor()`

As políticas existentes já cobrem os outros cenários:
- `"Clients can view own client record"` -- clientes veem apenas seu próprio registro
- `"Deny unauthenticated access to clients"` -- bloqueia acesso anônimo

## Detalhes Técnicos

```sql
-- Remover política permissiva
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Criar política restrita para admins e gestores
CREATE POLICY "Admins and gestores can view all clients"
  ON public.clients
  FOR SELECT
  USING (is_admin_or_gestor());
```

Após a migração, o acesso SELECT à tabela `clients` ficará assim:
- **Admin/Gestor**: vê todos os clientes
- **Cliente**: vê apenas seu próprio registro (via email)
- **Motorista**: sem acesso direto à tabela de clientes
- **Anônimo**: bloqueado

Nenhuma alteração de código é necessária -- apenas a política do banco de dados.

