
## Exibir anexos do solicitante no popup de detalhes

### Problema
Atualmente, os anexos originais da solicitacao so aparecem quando o usuario expande a etapa "Solicitada" na timeline. Eles deveriam estar visiveis diretamente na area principal do popup, junto com as observacoes.

### Solucao
Adicionar uma secao "Anexos" logo apos a secao "Observacoes" no componente `UnifiedRequestDetailsDialog`, exibindo os anexos do campo `request.attachments` usando o componente `AttachmentItem` ja existente.

### Detalhes tecnicos

**Arquivo:** `src/components/shared/UnifiedRequestDetailsDialog.tsx`

- Inserir um novo bloco apos a secao de Observacoes (apos linha ~524, antes do Separator da linha 526)
- O bloco so aparece se `request.attachments` tiver itens
- Usa o componente `AttachmentItem` (ja importado) para renderizar cada anexo com URLs assinadas
- Icone `Paperclip` (ja importado) como cabecalho da secao

Estrutura visual:
```text
Observacoes
  [texto ou textarea]

Anexos (novo)
  [imagem ou link para cada anexo]

--- Separator ---
Acompanhamento (timeline)
```
