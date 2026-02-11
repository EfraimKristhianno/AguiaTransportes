

## Correcoes: Camera mobile + Atualizacao em tempo real

### Problema 1: Foto da camera nao fica anexada

O input de camera com `capture="environment"` funciona de forma assincrona no mobile. Quando o usuario tira a foto e confirma, o evento `onChange` dispara, mas em alguns dispositivos moveis (especialmente Android WebView/PWA), o componente Dialog do Radix pode interferir no foco e fazer com que o evento se perca ou o estado nao atualize corretamente.

**Causa raiz:** Os inputs de arquivo estao DENTRO do escopo do Dialog no `UnifiedRequestDetailsDialog.tsx` (linha 330-344) e no `RequestForm.tsx` (linha 610-630). Em dispositivos moveis, ao abrir a camera, o Dialog pode perder o foco e, ao retornar, o React pode nao processar o evento corretamente.

**Solucao:**
- Mover os inputs de arquivo para FORA do Dialog, usando um portal ou colocando-os no nivel raiz do componente (antes do `<Dialog>`)
- Ja esta assim no `UnifiedRequestDetailsDialog.tsx` (inputs estao antes do Dialog na linha 330), mas precisa garantir que o `handleFileChange` esteja robusto
- No `RequestForm.tsx`, os inputs estao dentro do form, o que pode causar submit acidental
- Adicionar um pequeno delay/feedback visual para garantir que o estado atualize apos o retorno da camera
- Usar `setTimeout` no handler para garantir que o estado do React processe corretamente apos o retorno da camera nativa

**Arquivos:** `src/components/shared/UnifiedRequestDetailsDialog.tsx`, `src/components/solicitacoes/RequestForm.tsx`

### Problema 2: App nao atualiza em tempo real

Atualmente, apenas motoristas recebem atualizacoes em tempo real via `useDriverNotifications.ts` (Supabase Realtime). Para admin, gestor e cliente, nao existe nenhuma subscription Realtime -- os dados so atualizam ao recarregar a pagina.

**Solucao:** Criar um hook `useRealtimeDeliveryRequests` que escuta mudancas na tabela `delivery_requests` via Supabase Realtime e invalida as queries do React Query automaticamente. Esse hook sera usado por TODOS os usuarios (nao apenas motoristas).

**Arquivos a criar/editar:**

1. **Criar `src/hooks/useRealtimeDeliveryRequests.ts`** -- Hook que:
   - Cria um canal Supabase Realtime escutando INSERT, UPDATE e DELETE na tabela `delivery_requests`
   - Em qualquer mudanca, invalida as queries `delivery_requests`, `driverRequests`, `request_history` e `nextRequestNumber`
   - Tambem escuta mudancas na tabela `delivery_request_status_history` para atualizar a timeline

2. **Editar `src/pages/Dashboard.tsx`** -- Adicionar `useRealtimeDeliveryRequests()` no componente Dashboard

3. **Editar `src/pages/Solicitacoes.tsx`** -- Adicionar `useRealtimeDeliveryRequests()` na pagina de solicitacoes

4. **Editar `src/pages/Motoristas.tsx`** -- Adicionar `useRealtimeDeliveryRequests()` na pagina de motoristas

### Problema 3: PWA pedindo atualizacao em loop

O `registerType: "autoUpdate"` ja esta configurado, mas o `usePWA.ts` apenas detecta a atualizacao e mostra o banner -- nao aplica automaticamente. Precisamos que, quando uma nova versao do service worker for instalada, ela seja ativada automaticamente sem interacao do usuario.

**Solucao:**
- Modificar `src/hooks/usePWA.ts` para chamar `skipWaiting` automaticamente quando detectar um novo service worker instalado, em vez de mostrar o banner
- Remover ou simplificar o `UpdateBanner` em `PWABanners.tsx`, ja que a atualizacao sera automatica

### Resumo das mudancas

| Arquivo | Acao |
|---|---|
| `src/hooks/useRealtimeDeliveryRequests.ts` | Criar - hook Realtime para todos os usuarios |
| `src/components/shared/UnifiedRequestDetailsDialog.tsx` | Editar - corrigir handler de camera mobile |
| `src/components/solicitacoes/RequestForm.tsx` | Editar - corrigir handler de camera mobile |
| `src/pages/Dashboard.tsx` | Editar - adicionar hook Realtime |
| `src/pages/Solicitacoes.tsx` | Editar - adicionar hook Realtime |
| `src/pages/Motoristas.tsx` | Editar - adicionar hook Realtime |
| `src/hooks/usePWA.ts` | Editar - auto-aplicar atualizacoes do SW |
| `src/components/PWABanners.tsx` | Editar - remover banner de atualizacao manual |

