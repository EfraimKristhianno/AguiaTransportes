

## Notificacoes para Motoristas e Ciclo de Vida PWA

### Resumo

Implementar um sistema de notificacoes em tempo real para motoristas quando novas solicitacoes chegam, utilizando Supabase Realtime. Alem disso, complementar os componentes do ciclo de vida do PWA que ja existem parcialmente.

### 1. Hook de Notificacoes do Motorista

**Novo arquivo: `src/hooks/useDriverNotifications.ts`**

- Subscribir no canal Realtime do Supabase na tabela `delivery_requests` para eventos INSERT e UPDATE
- Quando uma nova solicitacao for criada (INSERT) com `transport_type` compativel com os tipos do motorista, exibir toast de notificacao com som
- Quando uma solicitacao existente for atualizada para status `solicitada`/`enviada` e o `transport_type` for compativel, tambem notificar
- Solicitar permissao de Push Notification do navegador (API nativa) para exibir notificacoes mesmo com o app minimizado
- Invalidar automaticamente a query `driverRequests` para atualizar a listagem

### 2. Componente de Notificacao

**Novo arquivo: `src/components/DriverNotificationListener.tsx`**

- Componente wrapper que usa o hook acima
- Renderizado apenas quando o usuario logado tem role `motorista`
- Integrado no `App.tsx` dentro do `AuthProvider`
- Exibe notificacoes via:
  - Toast (sonner) com informacoes da solicitacao (origem, destino, tipo)
  - Notification API do navegador (push local) quando o app esta em segundo plano

### 3. Componentes do Ciclo de Vida PWA

**Atualizar `src/hooks/usePWA.ts`:**
- Adicionar metodo `requestNotificationPermission()` para solicitar permissao de notificacao
- Adicionar estado `notificationPermission` (granted/denied/default)
- Adicionar metodo `showNotification(title, body)` para enviar notificacao via Service Worker

**Atualizar `src/components/PWABanners.tsx`:**
- Adicionar `NotificationPermissionBanner` que aparece para motoristas pedindo permissao de notificacao

**Atualizar `src/App.tsx`:**
- Incluir o `DriverNotificationListener` e os banners PWA

### 4. Fluxo Tecnico

```text
Nova solicitacao criada (admin/gestor/cliente)
        |
        v
Supabase Realtime (canal delivery_requests)
        |
        v
useDriverNotifications (filtra por transport_type)
        |
        +---> Toast (sonner) com detalhes
        |
        +---> Notification API (se permitido)
        |
        +---> Invalidar query para atualizar lista
```

### Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `src/hooks/useDriverNotifications.ts` | Criar - hook de notificacoes realtime |
| `src/hooks/usePWA.ts` | Atualizar - adicionar metodos de notificacao |
| `src/components/DriverNotificationListener.tsx` | Criar - componente listener |
| `src/components/PWABanners.tsx` | Atualizar - banner de permissao |
| `src/App.tsx` | Atualizar - integrar listener e banners |

### Observacoes

- Nenhuma alteracao no banco de dados e necessaria, pois o Supabase Realtime ja funciona com as tabelas existentes
- As notificacoes push locais funcionam apenas quando o usuario concede permissao no navegador
- No iOS (Safari), as notificacoes push so funcionam se o app estiver instalado como PWA na tela inicial
