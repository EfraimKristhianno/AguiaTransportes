

## Plan: Implementar lógica de frete baseada em origem E destino

### Regras de negócio

1. Coleta = Metropolitana/Araucária + Entrega = Curitiba → preço Metropolitana/Araucária
2. Coleta = Curitiba + Entrega = Metropolitana/Araucária → preço Metropolitana/Araucária
3. Coleta = Curitiba + Entrega = Curitiba → preço Curitiba
4. Qualquer endereço fora das 3 regiões conhecidas → "A combinar"

Resumo: sempre prevalece a região "mais distante" (Metropolitana/Araucária > Curitiba). Se algum endereço não for reconhecido como Curitiba, Metropolitana ou Araucária, o frete fica "a combinar".

### Alterações

**1. `src/lib/regionDetection.ts`** - Nova função `resolveFreightRegion`

Criar uma função que recebe os dois endereços (origem e destino) e retorna a região efetiva para precificação, ou `null` para "a combinar":

```
resolveFreightRegion(originAddress, destinationAddress) → FreightRegion | 'a_combinar' | null
```

Lógica:
- Detecta região de cada endereço via `detectRegionFromAddress`
- Se algum for `null` → retorna `null`
- Se ambos = Curitiba → 'Curitiba'
- Se algum = Metropolitana ou Araucária → retorna essa região (prioridade Metropolitana/Araucária)
- Caso contrário → `null` (a combinar)

**2. `src/hooks/useFreightPrices.ts`** - Atualizar `getFreightPricesForRequest`

Aceitar `originAddress` e `destinationAddress` em vez de apenas `region`, e usar a nova `resolveFreightRegion` internamente. Atualizar `formatSingleFreightPrice` para retornar "A combinar" quando a região resolvida indicar isso.

**3. Atualizar todos os pontos de uso** (7 arquivos):

- `RequestForm.tsx` - enviar região correta ao salvar; exibir badge com região resolvida
- `RequestList.tsx` - passar ambos endereços para cálculo do frete
- `UnifiedRequestDetailsDialog.tsx` - idem
- `Solicitacoes.tsx` - idem para totais e PDF
- `Dashboard.tsx` - idem para totais
- `AdminVehicleView.tsx` - idem para relatório de veículos
- `EditRequestDialog.tsx` - atualizar região ao editar endereços

Em cada ponto, substituir chamadas como:
```ts
// Antes
const region = detectRegionForFreight(request.destination_address);
const prices = getFreightPricesForRequest(allPrices, clientId, transportType, region);

// Depois  
const freightRegion = resolveFreightRegion(request.origin_address, request.destination_address);
const prices = getFreightPricesForRequest(allPrices, clientId, transportType, freightRegion);
```

E `formatSingleFreightPrice` retornará "A combinar" quando `freightRegion` for `null` e não houver preços correspondentes.

**4. Campo `region` no banco** - Atualizar para salvar a região resolvida (já existe a coluna `region` em `delivery_requests`), usando a nova lógica ao criar/editar solicitações.

Nenhuma migração de banco necessária -- a coluna `region` já existe como `text`.

