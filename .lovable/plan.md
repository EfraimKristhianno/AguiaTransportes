
# Corrigir Exibicao dos Valores de Frete

## Situacao Atual

Verifiquei o banco de dados e **todos os precos de frete estao corretamente cadastrados** para todos os clientes mencionados (SVD Transportes, Associacao de Parkinson, Potenze Iluminacao, Buhler Group, Douprah, Voga Vedabras e Plona Equipamentos).

## Problemas Identificados no Codigo

### 1. Popup de Veiculos (VehicleDetailsPopover) - Funcional
O componente ja recebe o `clientId` e busca os precos corretamente. Porem, usa `as any` desnecessariamente na query do Supabase. Isso nao deveria quebrar, mas sera limpo.

### 2. RequestList (Pagina Solicitacoes) - SEM valor de frete
O componente `RequestList.tsx` **nao exibe nenhum valor de frete**. Nao importa nenhum hook de precos e nao tem campo de valor nos cards de solicitacao.

### 3. UnifiedRequestDetailsDialog - SEM valor de frete
O dialog de detalhes da solicitacao **nao possui nenhuma secao de valor de frete**. Nao importa hooks de precos.

### 4. Dashboard - Funcional
A logica de calculo esta correta. O card "Total Fretes" e a coluna "Valor" na tabela ja funcionam quando ha solicitacoes cadastradas. Como todos os dados foram apagados, o dashboard mostra vazio corretamente.

## Plano de Correcao

### Passo 1: Limpar casts desnecessarios no useFreightPrices
Remover `as any` das queries de `freight_prices` pois a tabela ja esta nos tipos gerados do Supabase.

### Passo 2: Adicionar valor de frete no RequestList
- Importar `useAllFreightPrices`, `getFreightPricesForRequest`, `formatSingleFreightPrice`
- Importar `detectRegionForFreight`
- Importar `useAuth` (ja importado) para verificar perfil
- Adicionar um campo "Valor" em cada card de solicitacao, visivel para admin, gestor e cliente
- Usar icone DollarSign para destacar

### Passo 3: Adicionar valor de frete no UnifiedRequestDetailsDialog
- Importar hooks de frete e funcao de deteccao de regiao
- Adicionar secao "Valor do Frete" na area de detalhes do transporte
- Calcular automaticamente com base no `client_id`, `transport_type` e regiao detectada do `destination_address`
- Visivel para admin, gestor e cliente (oculto para motorista)

### Passo 4: Verificar VehicleDetailsPopover
- Confirmar que o popover funciona corretamente ao selecionar transporte no formulario de solicitacao
- O `clientId` ja e passado corretamente no RequestForm

## Arquivos a Modificar
1. `src/hooks/useFreightPrices.ts` - Remover casts `as any`
2. `src/components/solicitacoes/RequestList.tsx` - Adicionar campo de valor do frete
3. `src/components/shared/UnifiedRequestDetailsDialog.tsx` - Adicionar secao de valor do frete

## Dados ja Cadastrados (Verificados)

| Cliente | Fiorino CWB | Fiorino Metro | Moto CWB | Moto Metro | Cam 3/4 | Cam Truck |
|---------|-------------|---------------|----------|------------|---------|-----------|
| SVD Transportes | R$ 85 | R$ 95 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Assoc. Parkinson | R$ 85 | R$ 95 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Potenze Iluminacao | R$ 85 | R$ 95 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Buhler Group | R$ 85 | R$ 95 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Douprah | R$ 85 | R$ 95 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Voga Vedabras | R$ 125 | R$ 145 | R$ 29 | R$ 45 | R$ 470 | R$ 470 |
| Plona Equip. | R$ 81/CWB, R$ 95/Metro, R$ 80/Araucaria | | R$ 26/CWB, R$ 45/Metro, R$ 30/Araucaria | | R$ 320 | R$ 320 |
