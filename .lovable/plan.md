

## Correção Definitiva dos Anexos

### Problema Identificado

Os arquivos estao sendo salvos no bucket com o caminho `status-attachments/{nomeArquivo}`, porem a politica de seguranca (RLS) do bucket exige que o caminho comece com o **ID da solicitacao** (`{delivery_request_id}/...`). Por isso, usuarios que nao sao admin/gestor nunca conseguem visualizar os anexos -- a politica de acesso simplesmente nao reconhece o arquivo como pertencente a nenhuma solicitacao.

### Solucao

1. **Corrigir o caminho de upload** no hook `useUpdateRequestStatus.ts`:
   - Antes: `status-attachments/{fileName}`
   - Depois: `{requestId}/status-attachments/{fileName}`
   - Isso faz com que a politica RLS existente reconheca o arquivo e autorize a leitura

2. **Passar o `requestId` para a funcao de upload**:
   - Alterar `useUploadStatusAttachment` para receber o `requestId` como parametro
   - Atualizar a chamada no `UnifiedRequestDetailsDialog.tsx` para passar o ID da solicitacao

3. **Adicionar politica de acesso mais ampla para `status-attachments/`**:
   - Criar uma politica SELECT adicional que permita usuarios autenticados acessarem arquivos cujo caminho comeca com um `delivery_request_id` ao qual eles estao vinculados (como cliente ou motorista)
   - Isso garante compatibilidade com arquivos antigos no caminho `status-attachments/` sem prefixo

4. **Migrar arquivos antigos (SQL)**:
   - Atualizar os registros existentes na tabela `delivery_request_status_history` para corrigir os caminhos dos anexos ja salvos, adicionando o prefixo do `delivery_request_id`

### Detalhes Tecnicos

**Arquivo: `src/hooks/useUpdateRequestStatus.ts`**
- `useUploadStatusAttachment` passara a receber `{ file, requestId }` em vez de apenas `file`
- Caminho gerado: `${requestId}/status-attachments/${fileName}`

**Arquivo: `src/components/shared/UnifiedRequestDetailsDialog.tsx`**
- Atualizar a chamada de upload para incluir `requestId`:
  ```
  uploadMutation.mutateAsync({ file, requestId: request.id })
  ```

**Migracao SQL:**
- Atualizar os caminhos dos anexos existentes na tabela `delivery_request_status_history` para incluir o prefixo `delivery_request_id`
- Mover os objetos no bucket usando funcao SQL ou marcar para reupload

**Nova politica de storage (fallback):**
- Adicionar politica SELECT para cobrir o padrao `status-attachments/%` vinculando ao `delivery_request_status_history.attachments` contendo o path

### Resultado Esperado

Todos os anexos, novos e antigos, serao acessiveis por clientes e motoristas vinculados a solicitacao, sem erros de carregamento.

