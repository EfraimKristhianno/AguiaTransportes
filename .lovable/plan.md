

# Historico de Status das Solicitacoes

## Resumo

Ao clicar em uma solicitacao na lista (lado direito), um painel/dialog sera aberto mostrando uma **timeline visual** com todos os status pelos quais a solicitacao passou, incluindo data/hora de cada mudanca.

## O que sera feito

### 1. Nova tabela no banco de dados: `delivery_request_status_history`

Como o sistema atualmente armazena apenas o status atual de cada solicitacao, sera criada uma tabela de historico com um trigger automatico que registra cada mudanca de status.

**Colunas:**
- `id` (uuid, PK)
- `delivery_request_id` (uuid, FK para delivery_requests)
- `status` (text)
- `changed_by` (uuid, usuario que fez a mudanca)
- `changed_at` (timestamptz, momento da mudanca)
- `notes` (text, observacoes opcionais)

**Trigger:** A cada INSERT ou UPDATE na tabela `delivery_requests`, se o status mudou (ou e um novo registro), uma linha sera inserida automaticamente na tabela de historico.

**RLS:** Mesmas regras da tabela `delivery_requests` — admins/gestores veem tudo, clientes veem apenas suas solicitacoes, motoristas veem as atribuidas a eles.

**Retroativo:** Um comando INSERT populara o historico com os registros existentes usando o status e `created_at` atuais.

### 2. Interface: Dialog com timeline ao clicar na solicitacao

Ao clicar em um card na lista de solicitacoes, abrira um **Dialog** contendo:

- Cabecalho com numero da solicitacao (#000001), cliente e material
- **Timeline vertical** mostrando cada etapa do fluxo:

```text
  [o] Solicitada    - 05/02/2026 as 10:30
  |
  [o] Aceita        - 05/02/2026 as 11:15
  |
  [o] Coletada      - 05/02/2026 as 14:00
  |
  [o] Em Transito   - 05/02/2026 as 15:30
  |
  [ ] Entregue      - (pendente)
```

- Cada ponto preenchido representa um status ja atingido, com data/hora
- Pontos vazios representam etapas futuras
- Detalhes adicionais: enderecos, motorista atribuido, observacoes

### 3. Novo hook: `useRequestHistory`

Hook React Query para buscar o historico de status de uma solicitacao especifica.

---

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Tabela de historico
CREATE TABLE public.delivery_request_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_request_id uuid NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- RLS
ALTER TABLE public.delivery_request_status_history ENABLE ROW LEVEL SECURITY;

-- Policies (espelho de delivery_requests)
CREATE POLICY "Admins and gestores can view all history"
  ON delivery_request_status_history FOR SELECT
  USING (is_admin_or_gestor());

CREATE POLICY "Clients can view own request history"
  ON delivery_request_status_history FOR SELECT
  USING (delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN clients c ON dr.client_id = c.id
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  ));

CREATE POLICY "Drivers can view assigned request history"
  ON delivery_request_status_history FOR SELECT
  USING (delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN drivers d ON dr.driver_id = d.id
    WHERE d.user_id = auth.uid()
  ));

-- Trigger para registrar mudancas automaticamente
CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO delivery_request_status_history (delivery_request_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delivery_status_change
AFTER INSERT OR UPDATE ON delivery_requests
FOR EACH ROW EXECUTE FUNCTION log_delivery_status_change();

-- Popular historico com dados existentes
INSERT INTO delivery_request_status_history (delivery_request_id, status, changed_at)
SELECT id, status, created_at FROM delivery_requests;
```

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `src/hooks/useRequestHistory.ts` | **Novo** - Hook para buscar historico de status |
| `src/components/solicitacoes/RequestDetailsDialog.tsx` | **Novo** - Dialog com timeline visual |
| `src/components/solicitacoes/RequestList.tsx` | **Modificado** - Adicionar onClick nos cards e estado do dialog |

### Componente RequestDetailsDialog

- Recebe `requestId` e `open/onClose`
- Busca dados da solicitacao e seu historico via hooks
- Renderiza timeline vertical com indicadores visuais de progresso
- Mostra detalhes completos: cliente, telefone, enderecos, motorista, observacoes, anexos

### Hook useRequestHistory

```typescript
export const useRequestHistory = (requestId: string | null) => {
  return useQuery({
    queryKey: ['request_history', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_request_status_history')
        .select('*')
        .eq('delivery_request_id', requestId)
        .order('changed_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};
```

### Modificacao no RequestList

- Adicionar `cursor-pointer` e `onClick` em cada card
- Estado `selectedRequestId` para controlar qual dialog esta aberto
- Renderizar `<RequestDetailsDialog>` condicionalmente

