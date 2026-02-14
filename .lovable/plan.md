
# Tornar os campos de Placa editaveis nos dialogs de Veiculos

## Resumo
Remover o atributo `disabled` dos campos de Placa nos tres dialogs (Novo Registro, Troca de Oleo, Manutencao) e adicionar `plate` ao estado de cada formulario, permitindo que o motorista digite/edite a placa livremente.

## Alteracoes

Arquivo unico: `src/components/veiculos/DriverVehicleView.tsx`

### 1. Adicionar campo `plate` aos estados dos formularios

- `logForm`: adicionar `plate: ''`
- `oilForm`: adicionar `plate: ''`
- `maintForm`: adicionar `plate: ''`

### 2. Pre-preencher a placa ao selecionar veiculo

Nos `onValueChange` dos Selects de veiculo, alem de atualizar `vehicle_id`, tambem preencher `plate` com a placa do veiculo selecionado:

```text
onValueChange={v => {
  const veh = driverVehicles.find((x: any) => x.id === v);
  setLogForm(p => ({ ...p, vehicle_id: v, plate: veh?.plate || '' }));
}}
```

Mesma logica para `oilForm` e `maintForm`.

### 3. Tornar os Inputs de Placa editaveis

Substituir os inputs `disabled` por inputs com `onChange`:

```text
<Input
  value={logForm.plate}
  onChange={e => setLogForm(p => ({ ...p, plate: e.target.value }))}
  placeholder="Digite a placa"
/>
```

### 4. Usar a placa editavel no submit de Manutencao

No `handleSubmitMaintenance`, trocar `selectedMaintVehicle?.plate` por `maintForm.plate`:

```text
vehicle_plate: maintForm.plate || '',
```

### 5. Resetar plate ao fechar dialogs

Incluir `plate: ''` nos resets de cada formulario apos sucesso.

## Visibilidade por perfil
Sem alteracao -- apenas motoristas usam esses dialogs.
