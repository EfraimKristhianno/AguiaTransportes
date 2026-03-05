

## Diagnóstico do Problema

O vídeo mostra a tela recarregando infinitamente no celular. A causa raiz é uma combinação de dois problemas:

1. **`sessionStorage` não persiste em reloads de PWA no celular** — Em muitos navegadores móveis, `sessionStorage` é limpa quando a página recarrega ou quando o app PWA é reaberto. Então o flag `pwa-update-dismissed-v2` é perdido a cada reload.

2. **`window.location.reload()` no `handleUpdate` cria um loop** — Após o reload, o Service Worker ainda detecta uma atualização pendente, `needRefresh` volta a ser `true`, o `sessionStorage` está limpo, e o prompt aparece de novo, causando outro reload.

## Plano de Correção

### 1. Trocar `sessionStorage` por `localStorage` com TTL

Usar `localStorage` com um timestamp. Após clicar em "Atualizar" ou "Fechar", salvar a hora atual. O prompt só reaparece se passaram mais de 24 horas desde a última dispensa. Isso sobrevive a reloads e reopenings do app.

### 2. Remover `window.location.reload()`

Eliminar completamente o `setTimeout(() => window.location.reload(), 500)`. Em vez disso, chamar `updateServiceWorker(true)` que faz o reload controlado pela biblioteca vite-plugin-pwa. Mas SOMENTE se o prompt não foi previamente dispensado (verificado via localStorage).

### 3. Proteção contra loop no `useRegisterSW`

Adicionar verificação do localStorage ANTES de permitir que `needRefresh` mostre o prompt. Se foi dispensado nas últimas 24h, ignorar silenciosamente.

### Arquivo alterado

**`src/components/PWAUpdatePrompt.tsx`** — Refatoração completa:
- `localStorage` com chave contendo timestamp ao invés de `sessionStorage` com boolean
- Função `isDismissedRecently()` que verifica se passaram menos de 24h
- `handleUpdate`: seta localStorage, chama `updateServiceWorker(true)` sem reload manual
- `handleDismiss`: seta localStorage, esconde prompt
- Guard no render: se dispensado recentemente, retorna null

