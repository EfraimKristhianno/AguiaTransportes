

## Problema

Quando o motorista faz login, os dados da pagina "Minhas Corridas" nao aparecem imediatamente porque:

1. O hook `useCurrentDriver` usa `staleTime: 5 minutos` e `refetchOnWindowFocus: false`, o que impede a re-busca dos dados
2. O hook pode executar antes da autenticacao estar pronta, retornar `null`, e nao tentar novamente
3. O hook `useDriverRequests` tambem usa `refetchOnWindowFocus: false` e depende dos dados do driver para ser ativado

## Solucao

Ajustar os hooks para que respondam corretamente ao estado de autenticacao:

### 1. Corrigir `useCurrentDriver` (src/hooks/useDriverRequests.ts)

- Adicionar o `user.id` como parte da `queryKey`, fazendo o React Query re-executar automaticamente quando o usuario mudar
- Reduzir o `staleTime` para um valor menor (30 segundos) para permitir atualizacoes mais rapidas
- Adicionar `enabled: !!user` para so executar quando houver usuario autenticado
- Importar `useAuth` do contexto para obter o usuario atual

### 2. Corrigir `useDriverRequests` (src/hooks/useDriverRequests.ts)

- Remover `refetchOnWindowFocus: false` para permitir atualizacao ao voltar para a aba

### 3. Invalidar `currentDriver` no realtime (src/hooks/useRealtimeDeliveryRequests.ts)

- Adicionar `queryClient.invalidateQueries({ queryKey: ['currentDriver'] })` na funcao `invalidateAll` para que mudancas em tempo real tambem atualizem os dados do motorista

---

### Detalhes Tecnicos

**src/hooks/useDriverRequests.ts** - `useCurrentDriver`:
- Importar `useAuth` de `@/contexts/AuthContext`
- Usar `const { user } = useAuth()` para obter o usuario
- Mudar `queryKey` de `['currentDriver']` para `['currentDriver', user?.id]`
- Mudar `staleTime` de 5 minutos para 30 segundos
- Adicionar `enabled: !!user`
- Remover a chamada interna `supabase.auth.getUser()` e usar `user.id` diretamente

**src/hooks/useDriverRequests.ts** - `useDriverRequests`:
- Remover `refetchOnWindowFocus: false`

**src/hooks/useRealtimeDeliveryRequests.ts**:
- Adicionar invalidacao da query `currentDriver` no `invalidateAll`

