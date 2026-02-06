
# Plano: Renomear Status e Corrigir Estatisticas dos Motoristas

## 1. Renomear "Em Entrega (Rota)" para "Em Transito"

Trocar o label do status `em_rota` em todos os arquivos onde aparece:

- **`src/components/solicitacoes/RequestList.tsx`** (linha 16): `'Em Entrega (Rota)'` para `'Em Trânsito'`
- **`src/components/solicitacoes/RequestList.tsx`** (linha 46): `'Em Rota'` para `'Em Trânsito'`
- **`src/pages/Dashboard.tsx`** (linha 61): `'Em Entrega (Rota)'` para `'Em Trânsito'`
- **`src/pages/Dashboard.tsx`** (linha 205): `'Em Rota'` para `'Em Trânsito'`
- **`src/pages/Motoristas.tsx`** (linha 39): `'Em rota'` para `'Em Trânsito'`

## 2. Corrigir Estatisticas dos Motoristas (Total, Concluidas, Ativas)

Atualmente o hook `useDrivers` retorna valores fixos `0` para as estatisticas. Sera atualizado para buscar dados reais da tabela `delivery_requests`:

### Arquivo: `src/hooks/useDrivers.ts`

Alterar a query para contar as entregas de cada motorista a partir da tabela `delivery_requests`:

- **total_deliveries**: total de `delivery_requests` onde `driver_id` corresponde ao motorista
- **completed_deliveries**: total onde `status = 'entregue'`
- **active_deliveries**: total onde `status` esta em `['aceita', 'coletada', 'em_rota']`

A implementacao fara uma consulta adicional agrupada por `driver_id` na tabela `delivery_requests` e combinara os resultados com os dados dos motoristas.

---

## Detalhes Tecnicos

### Query para estatisticas

```typescript
// Buscar todas as delivery_requests com driver_id
const { data: deliveries } = await supabase
  .from('delivery_requests')
  .select('driver_id, status')
  .not('driver_id', 'is', null);

// Agrupar por driver_id no frontend
const statsMap = {};
deliveries?.forEach(d => {
  if (!statsMap[d.driver_id]) statsMap[d.driver_id] = { total: 0, completed: 0, active: 0 };
  statsMap[d.driver_id].total++;
  if (d.status === 'entregue') statsMap[d.driver_id].completed++;
  if (['aceita', 'coletada', 'em_rota'].includes(d.status)) statsMap[d.driver_id].active++;
});

// Combinar com drivers
const driversWithStats = data.map(driver => ({
  ...driver,
  total_deliveries: statsMap[driver.id]?.total || 0,
  completed_deliveries: statsMap[driver.id]?.completed || 0,
  active_deliveries: statsMap[driver.id]?.active || 0,
}));
```

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/solicitacoes/RequestList.tsx` | Renomear labels de `em_rota` |
| `src/pages/Dashboard.tsx` | Renomear labels de `em_rota` |
| `src/pages/Motoristas.tsx` | Renomear label do status `busy` |
| `src/hooks/useDrivers.ts` | Buscar estatisticas reais do banco |
