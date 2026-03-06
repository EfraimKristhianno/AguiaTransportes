

## Plano: Adicionar OneSignal SDK ao projeto

O OneSignal App ID (`bde63d28-81f0-4d42-a195-99ed3b24a541`) é uma chave pública, então pode ser adicionada diretamente ao código.

### Alterações

1. **`index.html`** — Adicionar o script do OneSignal SDK e o bloco de inicialização antes do fechamento do `</head>`:
   - Script CDN: `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` com `defer`
   - Bloco de inicialização com `appId: "bde63d28-81f0-4d42-a195-99ed3b24a541"`

2. **`src/main.tsx`** — Adicionar declaração de tipo para `window.OneSignalDeferred` para evitar erros TypeScript (opcional mas recomendado).

