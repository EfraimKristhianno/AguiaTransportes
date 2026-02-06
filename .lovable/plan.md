
# Plano de Correção: Loop Infinito de Redirecionamento

## Problema Identificado

O erro "Maximum update depth exceeded" ocorre devido a um **loop infinito de redirecionamento** entre rotas:

```text
+-------------------+       +--------------------+       +-------------------+
|   /solicitacoes   | ----> |   /motoristas      | ----> |   /solicitacoes   |
| (Solicitacoes.tsx)|       | (ProtectedRoute)   |       | (ProtectedRoute)  |
| redireciona       |       | motorista nao tem  |       | redireciona       |
| motorista para    |       | permissao, volta   |       | motorista para    |
| /motoristas       |       | para default       |       | /motoristas       |
+-------------------+       +--------------------+       +-------------------+
         ^                                                       |
         +-------------------------------------------------------+
                              LOOP INFINITO
```

**Causa raiz:**
1. Em `ProtectedRoute.tsx` (linha 25): A rota padrao do motorista esta definida como `/solicitacoes`
2. Em `Solicitacoes.tsx`: Motoristas sao redirecionados para `/motoristas`
3. Em `routePermissions` (linha 15): A rota `/motoristas` so permite `['admin', 'gestor']`, excluindo motoristas
4. Quando o motorista tenta acessar `/motoristas`, e redirecionado de volta para a rota padrao (`/solicitacoes`), criando o loop

## Solucao

Atualizar as permissoes e rotas padrao em `ProtectedRoute.tsx`:

1. Alterar a rota padrao do motorista de `/solicitacoes` para `/motoristas`
2. Adicionar `motorista` as permissoes da rota `/motoristas`

---

## Detalhes Tecnicos

### Arquivo: `src/components/ProtectedRoute.tsx`

**Alteracao 1 - Permissoes de rota (linha 15):**
```typescript
// ANTES
'/motoristas': ['admin', 'gestor'],

// DEPOIS
'/motoristas': ['admin', 'gestor', 'motorista'],
```

**Alteracao 2 - Rota padrao do motorista (linha 25):**
```typescript
// ANTES
const defaultRoutes: Record<UserRole, string> = {
  admin: '/dashboard',
  gestor: '/dashboard',
  motorista: '/solicitacoes',  // <-- PROBLEMA
  cliente: '/solicitacoes',
};

// DEPOIS
const defaultRoutes: Record<UserRole, string> = {
  admin: '/dashboard',
  gestor: '/dashboard',
  motorista: '/motoristas',    // <-- CORRIGIDO
  cliente: '/solicitacoes',
};
```

---

## Resultado Esperado

Apos as correcoes:
- Motoristas serao redirecionados diretamente para `/motoristas` apos login
- Motoristas terao permissao de acessar a rota `/motoristas`
- O loop infinito sera eliminado
- A tela de Motoristas exibira corretamente as solicitacoes disponiveis para aceitar
