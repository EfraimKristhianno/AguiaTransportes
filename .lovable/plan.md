
# Prevenir Aceitacao Duplicada e Remover Solicitacao da Lista

## Problema
Quando um motorista aceita uma solicitacao, ela continua visivel para outros motoristas. Isso permite que dois motoristas aceitem a mesma corrida. A solicitacao precisa sumir imediatamente da tela dos outros motoristas.

## Solucao em 2 Partes

### 1. Protecao Atomica no Banco (useDriverRequests.ts)
Modificar o `useAcceptDeliveryRequest` para incluir uma condicao de status no UPDATE. Se outro motorista ja aceitou, o UPDATE retorna zero linhas e o sistema mostra uma mensagem de erro clara.

```text
Antes:
  .update({ status: 'aceita', driver_id })
  .eq('id', requestId)
  .select().single()

Depois:
  .update({ status: 'aceita', driver_id })
  .eq('id', requestId)
  .in('status', ['solicitada', 'enviada'])   // <-- so aceita se disponivel
  .select()
  // verificar se retornou 0 linhas = ja foi aceita
```

Se `data` estiver vazio, lancar erro: "Esta solicitacao ja foi aceita por outro motorista."

Alem disso, no `onError`, invalidar as queries para forcar a atualizacao da lista, removendo a solicitacao da tela.

### 2. Atualizacao Imediata via Realtime (ja funciona parcialmente)
O hook `useRealtimeDeliveryRequests` ja invalida a query `driverRequests` quando `delivery_requests` muda. Quando o motorista A aceita, o status muda para `aceita` e o UPDATE dispara o evento realtime. No re-fetch do motorista B, a query filtra por `status IN ('solicitada', 'enviada')`, entao a solicitacao aceita nao retorna mais -- desaparecendo da lista.

Porem, para garantir que nao haja atraso, vamos adicionar um `refetchInterval` curto (5 segundos) no `useDriverRequests` como fallback de seguranca.

### 3. Feedback no Dialog (UnifiedRequestDetailsDialog.tsx)
Tratar o erro especifico no `handleAccept`:
- Mostrar toast de erro claro
- Fechar o dialog automaticamente
- Invalidar queries para atualizar a lista

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useDriverRequests.ts` | Adicionar `.in('status', ...)` no UPDATE, verificar resultado vazio, invalidar queries no erro, adicionar `refetchInterval: 5000` |
| `src/components/shared/UnifiedRequestDetailsDialog.tsx` | Tratar erro de "ja aceita" no `handleAccept`, fechar dialog e atualizar lista |

## Resultado Esperado
- Se motorista A aceita primeiro, motorista B recebe mensagem "Esta solicitacao ja foi aceita por outro motorista" caso tente aceitar
- A solicitacao desaparece da lista do motorista B em ate 5 segundos (via realtime ou polling)
- Apenas o motorista que aceitou continua vendo a solicitacao (com status "Aceita")
