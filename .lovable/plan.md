

## Plano: Adicionar OneSignalSDKWorker.js ao projeto

O arquivo `OneSignalSDKWorker.js` é o Service Worker necessário pelo OneSignal e deve ficar na raiz pública do projeto (pasta `public/`).

### Alteração

1. **Copiar `OneSignalSDKWorker.js` para `public/`** — O arquivo será copiado de `user-uploads://` para `public/OneSignalSDKWorker.js`. Isso é necessário para que o OneSignal SDK consiga registrar o Service Worker corretamente na raiz do domínio.

