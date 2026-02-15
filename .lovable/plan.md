
# Alerta Sonoro nas Notificações de Solicitação

## Objetivo
Adicionar um som de alerta quando uma notificação de nova solicitação de coleta chega para o motorista, tanto via notificação nativa/push (OneSignal) quanto via realtime (toast in-app).

## O que será feito

### 1. Adicionar arquivo de som ao projeto
- Criar/adicionar um arquivo de áudio curto (ex: `public/notification-sound.mp3`) que será tocado quando a notificação chegar.

### 2. Som no alerta in-app (Realtime)
- No hook `useDriverNotifications.ts`, ao detectar uma nova solicitação via Supabase Realtime, tocar o som usando a Web Audio API (`new Audio('/notification-sound.mp3').play()`).
- Criar uma função utilitária `playNotificationSound()` que será chamada junto com o toast e a notificação nativa.

### 3. Som na notificação push (OneSignal)
- Atualizar a Edge Function `notify-driver` para incluir o campo `chrome_web_sound` e/ou `web_sound` no payload do OneSignal, apontando para a URL do arquivo de som hospedado.
- Alternativamente, usar o campo `sound` no payload da notificação nativa do Service Worker (na função `showNativeNotification`), adicionando a propriedade `silent: false`.

---

## Detalhes Técnicos

### Arquivo de som
- Formato MP3 leve (1-2 segundos), salvo em `public/notification-sound.mp3`.
- Será gerado um tom de alerta simples via Web Audio API como fallback caso o arquivo nao carregue.

### useDriverNotifications.ts
```typescript
function playNotificationSound() {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}
```
- Chamar `playNotificationSound()` nos dois pontos de notificacao: INSERT e UPDATE de delivery_requests.

### notify-driver Edge Function
- Adicionar `chrome_web_sound` no payload OneSignal para que o push nativo toque som automaticamente.

### showNativeNotification
- Adicionar `silent: false` e `requireInteraction: true` nas opcoes da notificacao para garantir que o som padrao do sistema toque.

## Resumo das alteracoes
1. Adicionar `public/notification-sound.mp3` (arquivo de audio)
2. Editar `src/hooks/useDriverNotifications.ts` (adicionar funcao de som e chama-la)
3. Editar `supabase/functions/notify-driver/index.ts` (adicionar campo de som no payload OneSignal)
