

## Diagnóstico

O problema é causado pelo **Service Worker do PWA** que está servindo versões cacheadas dos arquivos. A configuração atual do Workbox usa `registerType: "autoUpdate"`, mas falta configurar `skipWaiting` e `clientsClaim` diretamente no workbox para forçar a ativação imediata do novo Service Worker.

## Plano de Correção

### 1. Atualizar configuração do Workbox no `vite.config.ts`
- Adicionar `skipWaiting: true` e `clientsClaim: true` na seção `workbox` para que o novo SW assuma o controle imediatamente sem esperar o usuário fechar todas as abas.
- Adicionar `cleanupOutdatedCaches: true` para remover caches antigos automaticamente.

### 2. Forçar limpeza de cache no `src/main.tsx`
- Adicionar código de inicialização que, ao detectar um SW antigo, força a limpeza dos caches do navegador e recarrega a página uma vez.
- Usar `caches.keys()` para deletar todos os caches Workbox existentes na primeira carga.

### Detalhes técnicos

**`vite.config.ts`** — seção `workbox`:
```typescript
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // ... resto da config existente
}
```

**`src/main.tsx`** — adicionar antes do `ReactDOM.createRoot`:
```typescript
// Force clear outdated SW caches on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.update());
  });
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('workbox') || name.includes('precache')) {
        caches.delete(name);
      }
    });
  });
}
```

Estas mudanças garantirão que:
1. Novas versões do app sejam ativadas imediatamente
2. Caches antigos sejam limpos automaticamente
3. O usuário sempre veja a versão mais recente

