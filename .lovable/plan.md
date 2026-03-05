

## Plan: Atualizar credenciais VAPID para notificações push

### O que será feito

As credenciais VAPID que você compartilhou precisam ser atualizadas em dois lugares:

1. **Secrets do Supabase** (usados pela Edge Function `notify-driver`):
   - `VAPID_PUBLIC_KEY` → `BE0HfQeUt04qQQGS9Rr2AnSmFUNFE12Otsrn94riIJ7EhOrd8aQnCLs7AdGboHu8vMWlqE6plwI_tNaSPcVixxw`
   - `VAPID_PRIVATE_KEY` → `6O4FZpC65GpnRgd-gC8179GCICPugkv8d3VxsCC_qEM`
   - `VAPID_SUBJECT` → `mailto:efraimkristhianno@gmail.com`

2. **Variável de ambiente do frontend** (`.env`):
   - `VITE_VAPID_PUBLIC_KEY` → atualizar com a nova chave pública

3. **Limpeza de cache (main.tsx)**: Incrementar versão para `v7` para forçar re-inscrição dos service workers com a nova chave VAPID.

### Detalhes técnicos

- O hook `useWebPush.ts` já possui lógica para detectar mudança de chave VAPID e forçar re-inscrição automaticamente — nenhuma alteração de código necessária nele.
- A Edge Function `notify-driver` já lê as secrets via `Deno.env.get()` — só precisa atualizar os valores.
- O `main.tsx` desregistra service workers antigos no carregamento, garantindo que a nova chave será usada.

