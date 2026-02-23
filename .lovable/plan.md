

## Plano: Corrigir Recuperacao de Senha (Link Invalido)

### Problema Identificado
Quando o usuario clica no link de recuperacao de senha, a pagina `/reset-password` carrega e executa `getSession()` imediatamente. Porem, o Supabase JS SDK ainda nao processou os tokens do hash da URL naquele momento, resultando em `session = null`. Isso faz a pagina redirecionar para `/` (login) antes que a sessao de recuperacao seja estabelecida. Quando o usuario tenta clicar no link novamente, o token ja foi consumido ("One-time token not found").

Nos logs de auth, vemos exatamente isso:
- 21:17:31 - Primeiro /verify - sucesso (token consumido)
- 21:18:08 - Segundo /verify - falha "One-time token not found"

### Solucao

Modificar **`src/pages/ResetPassword.tsx`** para usar `onAuthStateChange` em vez de `getSession()`:

1. Remover a verificacao via `getSession()` que redireciona prematuramente
2. Usar `supabase.auth.onAuthStateChange()` para detectar o evento `PASSWORD_RECOVERY`
3. Aguardar ate 5 segundos pelo evento antes de considerar o link invalido
4. Manter o estado de "carregando" enquanto aguarda o processamento dos tokens da URL

### Detalhes Tecnicos

**Arquivo: `src/pages/ResetPassword.tsx`**

Substituir o `useEffect` atual (linhas 29-43) por:

```typescript
useEffect(() => {
  let timeout: NodeJS.Timeout;
  let settled = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (settled) return;

    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
      settled = true;
      setSessionReady(true);
      clearTimeout(timeout);
    }
  });

  // Also check if already has session (e.g. page refresh)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && !settled) {
      settled = true;
      setSessionReady(true);
      clearTimeout(timeout);
    }
  });

  // Timeout - if no session after 5s, redirect
  timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      toast({
        variant: 'destructive',
        title: 'Link invalido ou expirado',
        description: 'Solicite um novo link de recuperacao de senha.',
      });
      navigate('/');
    }
  }, 5000);

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeout);
  };
}, [navigate, toast]);
```

- Adicionar estado `sessionReady` inicializado como `false`
- Mostrar tela de carregamento enquanto `sessionReady === false`
- Quando `sessionReady === true`, mostrar o formulario de nova senha

### Resumo das Mudancas

| Arquivo | Mudanca |
|---|---|
| `src/pages/ResetPassword.tsx` | Substituir `getSession()` por `onAuthStateChange` com timeout de 5s e tela de loading |

