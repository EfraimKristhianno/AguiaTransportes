

## Problema

As datas estão sendo **salvas corretamente** no banco (ex: `"2026-03-04"`), mas ao **exibir** nas tabelas de histórico, o código usa `new Date("2026-03-04")` que interpreta a string como meia-noite UTC. No fuso horário do Brasil (UTC-3), isso vira `2026-03-03T21:00:00`, resultando na exibição do dia anterior.

Isso acontece em 3 lugares no `DriverVehicleView.tsx`:
- Linha 529: `format(new Date(log.log_date), 'dd/MM/yyyy')` — tabela de abastecimento
- Linha 572: `format(new Date(oil.change_date), 'dd/MM/yyyy')` — tabela de troca de óleo
- Linha 612: `format(new Date(m.maintenance_date), 'dd/MM/yyyy')` — tabela de manutenção

Também nas comparações de datas para filtros e ordenação (linha 261).

## Solução

Criar uma função `parseDateString` que interpreta "YYYY-MM-DD" como data local (não UTC):

```typescript
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
```

Substituir todas as ocorrências de `new Date(log.log_date)`, `new Date(oil.change_date)`, `new Date(m.maintenance_date)` e `new Date(record.change_date)` por `parseDateString(...)`.

## Arquivo alterado

- `src/components/veiculos/DriverVehicleView.tsx` — adicionar `parseDateString` e usá-la em todas as conversões de datas "YYYY-MM-DD" para `Date`.

