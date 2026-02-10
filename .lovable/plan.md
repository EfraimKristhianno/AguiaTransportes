

# Plano: Corrigir Upload de Anexos/Fotos no PWA Mobile

## Problema Identificado

O problema principal tem duas causas raiz:

1. **Inputs posicionados fora da tela com `position: fixed; top: -9999px`** -- em navegadores mobile (especialmente Safari PWA), inputs escondidos dessa forma frequentemente perdem o evento `onChange` ao retornar da galeria/camera. O browser "descarta" o input invisivel.

2. **Re-renderizacao ao retornar o foco** -- Quando o app PWA recupera o foco apos a galeria fechar, o React Query pode disparar `refetchOnWindowFocus`, causando re-renders que resetam o estado dos arquivos pendentes.

## Solucao

### 1. Renderizar os inputs via Portal no document.body

Em vez de esconder os inputs com CSS, usar `ReactDOM.createPortal` para renderizar os `<input type="file">` diretamente no `document.body`, fora de qualquer arvore React que possa ser desmontada. Isso garante que o input sobreviva a qualquer re-render do Dialog.

### 2. Usar `visibility: hidden; height: 0; overflow: hidden` ao inves de `top: -9999px`

Essa tecnica e mais confiavel em mobile porque o input permanece no fluxo do DOM sem ser "descartado" pelo browser.

### 3. Desativar `refetchOnWindowFocus` nas queries relevantes

Adicionar `refetchOnWindowFocus: false` no hook `useRequestHistory` e verificar o hook `useDeliveryRequests` para evitar re-renders inesperados quando o foco retorna da galeria.

### 4. Adicionar feedback visual de carregamento

Exibir um indicador de "Processando..." enquanto o arquivo e adicionado a lista, para o usuario saber que algo esta acontecendo.

### 5. Estabilizar o handleFileSelect com useCallback

Evitar que closures obsoletas causem perda de dados ao re-renderizar.

---

## Detalhes Tecnicos

### Arquivo: `src/components/shared/UnifiedRequestDetailsDialog.tsx`

**Inputs via Portal:**
```tsx
import { createPortal } from 'react-dom';

// Dentro do componente, renderizar inputs no body:
{createPortal(
  <>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*,video/*,application/pdf,.doc,.docx"
      multiple
      onChange={handleFileSelect}
      style={{ visibility: 'hidden', height: 0, overflow: 'hidden', position: 'absolute' }}
      tabIndex={-1}
    />
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFileSelect}
      style={{ visibility: 'hidden', height: 0, overflow: 'hidden', position: 'absolute' }}
      tabIndex={-1}
    />
  </>,
  document.body
)}
```

**Estado de carregamento para arquivo:**
```tsx
const [isProcessingFile, setIsProcessingFile] = useState(false);

const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  setIsProcessingFile(true);
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    setPendingFiles(prev => [...prev, ...files]);
  }
  e.target.value = '';
  setIsProcessingFile(false);
}, []);
```

**Feedback visual nos botoes:**
```tsx
<button onClick={openCamera} disabled={isProcessingFile}>
  {isProcessingFile ? <Loader2 className="animate-spin" /> : <Camera />}
  {isProcessingFile ? 'Processando...' : 'Tirar Foto'}
</button>
```

### Arquivo: `src/hooks/useRequestHistory.ts`

Adicionar `refetchOnWindowFocus: false`:
```tsx
useQuery({
  queryKey: ['request_history', requestId],
  queryFn: ...,
  enabled: !!requestId,
  refetchOnWindowFocus: false, // Evitar re-render ao voltar da galeria
});
```

### Arquivo: `src/hooks/useDriverRequests.ts`

Verificar e adicionar `refetchOnWindowFocus: false` na query principal.

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `UnifiedRequestDetailsDialog.tsx` | Inputs via createPortal, feedback de loading, useCallback |
| `useRequestHistory.ts` | Desativar refetchOnWindowFocus |
| `useDriverRequests.ts` | Desativar refetchOnWindowFocus |
| `useDeliveryRequests.ts` | Desativar refetchOnWindowFocus |

