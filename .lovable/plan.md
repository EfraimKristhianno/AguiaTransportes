
## Correcao definitiva: Dialog fechando no celular ao anexar arquivo/foto

### Diagnostico

As tres prevencoes no `DialogContent` (`onInteractOutside`, `onPointerDownOutside`, `onFocusOutside`) ja estao aplicadas, mas o dialog continua fechando no celular. Isso acontece porque o Radix Dialog pode disparar `onOpenChange(false)` no componente `Dialog` raiz por outros mecanismos internos (como deteccao de perda de foco do overlay ou reprocessamento do estado de abertura durante re-renders causados pelo retorno do seletor de arquivos).

A solucao definitiva e **controlar o `onOpenChange` no nivel do `Dialog` raiz**, impedindo fechamento automatico e permitindo apenas fechamento explicito (botao X ou acao do usuario dentro do dialog).

### Alteracoes

**Arquivo: `src/components/shared/UnifiedRequestDetailsDialog.tsx`**

1. **Substituir o `onOpenChange` direto no `Dialog`** por uma funcao controlada que so permite fechar o dialog quando o usuario explicitamente clica no botao X ou quando o codigo chama `onOpenChange(false)` apos uma acao concluida (aceitar, atualizar status, etc.).

   Criar um estado `isProcessingFile` (ref) que sera ativado quando o usuario clica em "Tirar Foto" ou "Anexar Arquivo" e desativado apos o arquivo ser selecionado ou o input ser cancelado. Durante esse periodo, qualquer chamada a `onOpenChange(false)` sera bloqueada.

2. **Nos inputs de arquivo** (botoes "Tirar Foto" e "Anexar Arquivo"), ao clicar, ativar o ref `isProcessingFile = true`. No evento `onChange` e `onCancel`/`onBlur` do input, desativar o ref.

3. **No `Dialog`**, a funcao `onOpenChange` so passara `false` para o pai quando `isProcessingFile.current === false`.

### Detalhes Tecnicos

```text
Dialog onOpenChange flow:

ANTES (quebrado):
  Camera abre -> foco sai -> Radix dispara onOpenChange(false) -> dialog fecha

DEPOIS (corrigido):
  Camera abre -> isProcessingFile = true
  Foco sai -> Radix dispara onOpenChange(false) -> funcao verifica isProcessingFile -> bloqueia
  Usuario volta com foto -> onChange dispara -> isProcessingFile = false
  Usuario clica X -> isProcessingFile = false -> fecha normalmente
```

**Alteracao 1 - Adicionar ref (apos as declaracoes de state existentes, ~linha 130):**
- Adicionar `const isProcessingFile = useRef(false);`

**Alteracao 2 - Dialog onOpenChange controlado (linha 325):**
```tsx
<Dialog open={open} onOpenChange={(newOpen) => {
  if (!newOpen && isProcessingFile.current) return; // bloqueia fechamento durante selecao de arquivo
  onOpenChange(newOpen);
}}>
```

**Alteracao 3 - Nos handlers dos botoes de arquivo/camera:**
- Antes de disparar o `click()` no input de arquivo, definir `isProcessingFile.current = true`
- No `onChange` do input de arquivo, definir `isProcessingFile.current = false` apos processar
- Adicionar um listener `focus` na window para resetar o ref caso o usuario cancele o seletor de arquivos (padrao comum em PWAs moveis):
```tsx
const handleFileInputClick = () => {
  isProcessingFile.current = true;
  // Fallback: reset after window regains focus (user cancelled)
  const resetOnFocus = () => {
    setTimeout(() => { isProcessingFile.current = false; }, 500);
    window.removeEventListener('focus', resetOnFocus);
  };
  window.addEventListener('focus', resetOnFocus);
  fileInputRef.current?.click();
};
```

**Alteracao 4 - No onChange do input de arquivo:**
- Adicionar `isProcessingFile.current = false;` no inicio do handler.

Isso garante que o dialog nunca feche durante a interacao com o seletor de arquivos ou camera, independentemente do dispositivo ou navegador.
