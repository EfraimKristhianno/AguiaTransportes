

## Diagnóstico

Os dados de preços de frete já existem no banco para todos os clientes, **exceto** para o "Bühler Group" (id `0b7002f0`) que é o registro usado nas solicitações — ele não tem preços cadastrados (o outro "Buhler Group" `529faa8b` tem).

O problema principal no código é simples: o `VehicleDetailsPopover` retorna `null` na linha 51 quando não encontra o tipo de veículo no array `VEHICLE_SPECS`. Como "Caminhão" não está nesse array, o botão de informações (com preços do frete) nunca aparece para esse tipo.

## Plano

### 1. Corrigir `VehicleDetailsPopover.tsx`

- Adicionar "Caminhão" ao array `VEHICLE_SPECS` com especificações aproximadas
- Alterar a condição de retorno: em vez de `if (!spec) return null`, verificar `if (!spec && prices.length === 0) return null` — assim o popover aparece quando houver preços mesmo sem spec
- Renderizar as dimensões condicionalmente (só se `spec` existir)

### 2. Inserir preços para "Bühler Group" (`0b7002f0`)

Esse cliente não tem nenhum registro em `freight_prices`. Inserir os mesmos valores do grupo SVD:
- Moto: Curitiba R$29 / Metropolitana R$45
- Fiorino: Curitiba R$85 / Metropolitana R$95
- Caminhão (3/4): Curitiba R$470 / Metropolitana R$470
- Caminhão: Curitiba R$470 / Metropolitana R$470

### Detalhes técnicos

**`VehicleDetailsPopover.tsx`** — mudanças:
```typescript
const VEHICLE_SPECS: VehicleSpec[] = [
  { type: 'Moto', length: 0.60, width: 0.60, height: 0.50, capacity: 25 },
  { type: 'Fiorino', length: 1.60, width: 1.10, height: 1.45, capacity: 450 },
  { type: 'Caminhão', length: 8.50, width: 2.48, height: 2.70, capacity: 12000 },
  { type: 'Caminhão (3/4)', length: 6.18, width: 2.39, height: 2.39, capacity: 5000 },
];

// Linha 51: trocar condição
if (!spec && prices.length === 0) return null;

// Renderizar dimensões só se spec existir
{spec && (
  <div className="grid grid-cols-2 gap-2 text-sm">
    ...dimensões...
  </div>
)}
```

**SQL para inserir preços do Bühler Group (`0b7002f0`)**:
```sql
INSERT INTO freight_prices (client_id, transport_type, region, price) VALUES
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Moto', 'Curitiba', 29),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Moto', 'Metropolitana', 45),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Fiorino', 'Curitiba', 85),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Fiorino', 'Metropolitana', 95),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Caminhão (3/4)', 'Curitiba', 470),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Caminhão (3/4)', 'Metropolitana', 470),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Caminhão', 'Curitiba', 470),
('0b7002f0-efe6-4466-9476-1d41f6dc1aaf', 'Caminhão', 'Metropolitana', 470);
```

Nenhuma outra mudança é necessária. O Dashboard e a tela de Solicitações já usam `useAllFreightPrices` e `getFreightPricesForRequest` corretamente — o problema era apenas o popover não renderizando para "Caminhão".

