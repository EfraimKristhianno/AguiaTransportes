

## Plano: Permitir Editar Todos os Campos do Usuario (Admin/Gestor)

### Problema Atual
- O campo **email** esta desabilitado (`disabled`) ao editar um usuario
- O `handleSubmitUser` so envia `name` e `phone` na atualizacao, ignorando o email
- Alterar o email exige atualizar tanto a tabela `users` quanto o `auth.users` do Supabase (via Admin API)

### Solucao

**1. Remover `disabled` do campo email no `UserFormDialog.tsx`**
- Linha 181: remover `disabled={isEditing}` para que o campo fique editavel

**2. Atualizar `handleSubmitUser` em `Usuarios.tsx`**
- Incluir `email` no objeto `updates` enviado ao `useUpdateUser` (linha 212)

**3. Modificar `useUpdateUser` em `useUsers.ts`**
- Quando o email for alterado, chamar uma Edge Function para atualizar o email no `auth.users` via Admin API
- Atualizar tambem a tabela `users`, `drivers` e `clients` onde o email antigo estiver registrado

**4. Criar/atualizar Edge Function para atualizar email do auth**
- Criar nova Edge Function `update-user-email` (ou expandir logica existente)
- Recebe `authId` e `newEmail`
- Valida que o chamador e admin (mesmo padrao das outras edge functions)
- Usa `adminClient.auth.admin.updateUserById(authId, { email: newEmail })` para atualizar no Supabase Auth
- Atualiza o email na tabela `users`, `drivers` e `clients` correspondentes

### Detalhes Tecnicos

**Arquivos a modificar:**

| Arquivo | Mudanca |
|---|---|
| `src/components/UserFormDialog.tsx` | Remover `disabled={isEditing}` do campo email |
| `src/pages/Usuarios.tsx` | Adicionar `email: data.email` no objeto `updates` do `handleSubmitUser` |
| `src/hooks/useUsers.ts` | No `useUpdateUser`, detectar mudanca de email e chamar edge function |
| `supabase/functions/update-user-email/index.ts` | Nova edge function para atualizar email no auth + tabelas relacionadas |

**Edge Function `update-user-email`:**
```
POST /functions/v1/update-user-email
Body: { "authId": "uuid", "newEmail": "novo@email.com" }
```
- Valida token JWT do admin
- Chama `adminClient.auth.admin.updateUserById(authId, { email: newEmail })`
- Atualiza `users.email` onde `auth_id = authId`
- Atualiza `drivers.email` onde `user_id = authId`
- Atualiza `clients.email` onde o email antigo correspondia

**Fluxo no frontend:**
1. Admin edita usuario e muda o email
2. `useUpdateUser` atualiza `name`, `phone` na tabela `users`
3. Se o email mudou, chama `update-user-email` edge function
4. Edge function atualiza email no auth e tabelas relacionadas
5. Invalidar queries para refletir as mudancas

