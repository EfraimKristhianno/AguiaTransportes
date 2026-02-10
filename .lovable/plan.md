
## Correcao do Dialog Fechando no Celular e Etapa "Solicitada" com Dados Originais

### Problema 1: Dialog fecha ao selecionar arquivo/foto no celular

O Radix Dialog tem tres eventos que podem fechar o dialog:
- `onPointerDownOutside` (ja tratado)
- `onInteractOutside` (ja tratado)
- `onFocusOutside` (NAO tratado - esta e a causa do problema no celular)

Quando o motorista abre a camera ou o seletor de arquivos no celular, o foco sai do dialog, disparando `onFocusOutside`, que fecha o dialog automaticamente. A solucao e adicionar `onFocusOutside={(e) => e.preventDefault()}` no `DialogContent`.

### Problema 2: Etapa "Solicitada" deve exibir dados originais

Na timeline, a etapa "Solicitada" deve mostrar as observacoes e anexos originais da solicitacao (os campos `notes` e `attachments` do `delivery_requests`), nao os do historico de status. Assim o motorista ve imediatamente o que foi informado quando a solicitacao foi criada.

### Alteracoes

**Arquivo: `src/components/shared/UnifiedRequestDetailsDialog.tsx`**

1. Adicionar `onFocusOutside={(e) => e.preventDefault()}` no `DialogContent` (linha 326) para impedir o fechamento do dialog quando o foco sai para o seletor de arquivos ou camera no celular.

2. Modificar a logica de exibicao expandida da etapa "Solicitada" na timeline (em torno das linhas 550-588) para:
   - Quando `step.value === 'solicitada'`, exibir `request.notes` como observacoes e `request.attachments` como anexos (dados originais da solicitacao)
   - Para todas as outras etapas, manter o comportamento atual usando `historyEntry.notes` e `historyEntry.attachments`

### Detalhes Tecnicos

Alteracao 1 - Linha 326:
```
<DialogContent
  className="max-w-lg max-h-[90vh] p-0 overflow-hidden"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
>
```

Alteracao 2 - Bloco expandido da timeline (linhas ~551-588):
Para a etapa "solicitada", usar `request.notes` e `request.attachments` em vez de `historyEntry.notes` e `historyEntry.attachments`. Para as demais etapas, manter `historyEntry`.
