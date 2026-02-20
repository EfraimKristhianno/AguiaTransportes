

# Plano: Salvar Placa nos Registros de Veiculos

## Problema
A placa do veiculo esta sendo capturada no formulario (campo `plate` no state), mas NAO esta sendo salva no banco de dados para os registros de abastecimento (`vehicle_logs`) e troca de oleo (`oil_change_records`). Apenas a tabela `maintenance_records` possui a coluna `vehicle_plate`.

## Solucao

### 1. Migracoes de Banco de Dados
Adicionar a coluna `vehicle_plate` nas tabelas que ainda nao possuem:

- **vehicle_logs**: `ALTER TABLE vehicle_logs ADD COLUMN vehicle_plate text;`
- **oil_change_records**: `ALTER TABLE oil_change_records ADD COLUMN vehicle_plate text;`

Alem disso, preencher retroativamente os registros existentes com a placa do veiculo vinculado:
```text
UPDATE vehicle_logs vl SET vehicle_plate = v.plate FROM vehicles v WHERE v.id = vl.vehicle_id;
UPDATE oil_change_records oc SET vehicle_plate = v.plate FROM vehicles v WHERE v.id = oc.vehicle_id;
```

### 2. Atualizar Hooks (`src/hooks/useVehicleLogs.ts`)
- **useCreateVehicleLog**: adicionar `vehicle_plate` como parametro aceito na mutacao e envia-lo no `insert`.
- **useCreateOilChange**: adicionar `vehicle_plate` como parametro aceito na mutacao e envia-lo no `insert`.

### 3. Atualizar Formularios (`src/components/veiculos/DriverVehicleView.tsx`)
- **handleSubmitLog**: incluir `vehicle_plate: logForm.plate` nos dados enviados ao hook.
- **handleSubmitOilChange**: incluir `vehicle_plate: oilForm.plate` nos dados enviados ao hook.
- (handleSubmitMaintenance ja envia `vehicle_plate` corretamente)

### 4. Dashboard Admin - Filtro por Placa
O filtro de busca por placa no `AdminVehicleView` ja existe e filtra pela tabela `vehicles`. Com a placa salva diretamente nos registros, o filtro continuara funcionando normalmente via join com a tabela vehicles. Nenhuma alteracao adicional necessaria no dashboard.

## Detalhes Tecnicos

### Arquivos Modificados
1. **Nova migracao SQL** - adicionar colunas + backfill
2. **src/hooks/useVehicleLogs.ts** - adicionar `vehicle_plate` nos tipos e mutacoes de `useCreateVehicleLog` e `useCreateOilChange`
3. **src/components/veiculos/DriverVehicleView.tsx** - passar `vehicle_plate` nas chamadas de `handleSubmitLog` e `handleSubmitOilChange`

### Impacto
- Registros existentes serao atualizados retroativamente com a placa correta
- Todos os novos registros (abastecimento, troca de oleo, manutencao) passarao a salvar a placa
- O dashboard de admin/gestor podera usar o campo `vehicle_plate` diretamente para filtragem

