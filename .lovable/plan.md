

# Plano: Migrar de OneSignal para VAPID Web Push Nativo

## Problema Atual
O OneSignal nao esta funcionando -- 100% das tentativas de envio falham com erros "invalid_aliases" e "All included players are not subscribed". Nenhum push notification chega em nenhum dispositivo.

## Solucao
Remover completamente o OneSignal e implementar Web Push nativo usando VAPID (Voluntary Application Server Identification), que funciona diretamente com a Push API do navegador, sem depender de servicos terceiros.

## Como Funciona

1. O motorista abre o app (PWA) e aceita notificacoes
2. O navegador gera uma "push subscription" (endpoint + chaves)
3. Essa subscription e salva no banco de dados (nova tabela `push_subscriptions`)
4. Quando uma nova solicitacao e criada, a edge function `notify-driver` busca as subscriptions dos motoristas e envia o push diretamente via Web Push Protocol

## Etapas de Implementacao

### 1. Adicionar Secrets VAPID
- Sera necessario adicionar duas secrets: `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`
- O usuario ja informou que tem as chaves prontas

### 2. Criar Tabela `push_subscriptions`
Nova tabela no banco para armazenar as subscriptions dos motoristas:
- `id` (uuid, PK)
- `user_id` (uuid, referencia auth.users)
- `endpoint` (text, URL do push service)
- `p256dh` (text, chave publica do cliente)
- `auth` (text, chave de autenticacao)
- `created_at` (timestamp)
- RLS: motoristas podem inserir/deletar suas proprias subscriptions; service role pode ler todas

### 3. Reescrever `src/hooks/useOneSignal.ts` -> `src/hooks/useWebPush.ts`
- Remover toda dependencia do OneSignal SDK
- Registrar o service worker do PWA (ja existe via vite-plugin-pwa)
- Solicitar permissao de notificacao
- Chamar `pushManager.subscribe()` com a VAPID public key
- Salvar a subscription no Supabase (tabela `push_subscriptions`)
- Tratar re-subscription quando a subscription expira

### 4. Criar Service Worker para Push (`public/sw-push.js`)
- Listener `push` para exibir a notificacao quando chega em background
- Listener `notificationclick` para abrir o app quando clicado

### 5. Reescrever Edge Function `notify-driver`
- Remover todo codigo OneSignal
- Buscar push_subscriptions dos motoristas alvo no banco
- Enviar notificacoes via Web Push Protocol usando VAPID com a biblioteca `web-push`
- Limpar subscriptions invalidas (HTTP 410 Gone)

### 6. Atualizar `DriverNotificationListener.tsx`
- Substituir `useOneSignal` por `useWebPush`

### 7. Limpar OneSignal
- Remover script do OneSignal do `index.html`
- Remover arquivo `public/OneSignalSDKWorker.js`
- Remover referencias no `vite.config.ts`
- Remover hook `useOneSignal.ts`

## Secao Tecnica

### Arquitetura do Web Push VAPID

```
[Motorista abre PWA]
    |
    v
[Browser gera PushSubscription]
    |
    v
[Salva no Supabase: push_subscriptions]
    |
    ...
[Admin cria solicitacao]
    |
    v
[DB Trigger -> Edge Function notify-driver]
    |
    v
[Edge Function busca subscriptions dos motoristas]
    |
    v
[Envia via Web Push Protocol (RFC 8030 + VAPID)]
    |
    v
[Push Service (Google FCM / Apple APNs)]
    |
    v
[Service Worker recebe evento 'push']
    |
    v
[Exibe notificacao nativa - funciona em background]
```

### Compatibilidade
- Android Chrome: Funciona em foreground e background
- iOS Safari 16.4+: Funciona quando instalado como PWA (Add to Home Screen) -- ja e o caso do iPhone 15 do usuario

### Arquivos Modificados/Criados
- **Novo**: `src/hooks/useWebPush.ts` (substitui useOneSignal)
- **Novo**: `public/sw-push.js` (service worker para push em background)
- **Novo**: Migracao SQL para tabela `push_subscriptions`
- **Editado**: `supabase/functions/notify-driver/index.ts` (reescrita completa)
- **Editado**: `src/components/DriverNotificationListener.tsx` (usar useWebPush)
- **Editado**: `index.html` (remover script OneSignal)
- **Editado**: `vite.config.ts` (remover referencias OneSignal)
- **Removido**: `src/hooks/useOneSignal.ts`
- **Removido**: `public/OneSignalSDKWorker.js`

