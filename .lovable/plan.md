
## Plano: Habilitar tela de Usuarios para Gestores

Tres arquivos precisam ser atualizados para adicionar `gestor` na permissao da rota `/usuarios`:

### 1. `src/components/ProtectedRoute.tsx`
- Adicionar `'gestor'` ao array de roles da rota `/usuarios` (linha 17)
- De: `'/usuarios': ['admin']`
- Para: `'/usuarios': ['admin', 'gestor']`

### 2. `src/components/DashboardLayout.tsx`
- Adicionar `'gestor'` ao array de roles do item de menu "Usuarios" (linha 39)
- De: `roles: ['admin'] as UserRole[]`
- Para: `roles: ['admin', 'gestor'] as UserRole[]`

### 3. `src/hooks/useUserRole.ts`
- Adicionar `'/usuarios'` na lista de rotas permitidas para o perfil `gestor` (linha 48)
- De: `gestor: ['/dashboard', '/solicitacoes', '/motoristas', '/clientes']`
- Para: `gestor: ['/dashboard', '/solicitacoes', '/motoristas', '/clientes', '/usuarios']`

Nenhuma alteracao de banco de dados ou edge function e necessaria, pois as permissoes de leitura/escrita da tabela `users` ja permitem acesso para gestores (via funcao `is_admin_or_gestor`).
