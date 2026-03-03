

## Plano: Garantir limpeza de cache sempre ativa

O `main.tsx` já limpa caches e desregistra Service Workers, mas o `PWAUpdatePrompt` re-registra um novo SW logo em seguida via `useRegisterSW`, anulando a limpeza.

### Mudanças

1. **`src/main.tsx`** — Manter o código atual de limpeza de cache (já está OK).

2. **`src/components/PWAUpdatePrompt.tsx`** — Adicionar limpeza de cache também no momento da atualização (quando o usuário clica "Atualizar"), garantindo que o SW novo comece com cache limpo.

3. **`vite.config.ts`** — Verificar se o `workbox` está configurado para não pré-cachear assets antigos (adicionar `skipWaiting: true` e `clientsClaim: true` se ausentes).

Isso garante que o cache seja limpo tanto no carregamento inicial quanto nas atualizações do PWA.

