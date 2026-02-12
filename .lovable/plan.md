

## Desabilitar autocomplete nos campos Nota Fiscal e O.P.

Adicionar `autoComplete="off"` apenas nos dois campos indicados no arquivo `src/components/solicitacoes/RequestForm.tsx`:

**Nota Fiscal (linha 576):**
Alterar de:
```
<Input {...field} placeholder="Número da NF" className="pl-9" />
```
Para:
```
<Input {...field} placeholder="Número da NF" className="pl-9" autoComplete="off" />
```

**O.P. (linha 591):**
Alterar de:
```
<Input {...field} placeholder="Número da O.P." />
```
Para:
```
<Input {...field} placeholder="Número da O.P." autoComplete="off" />
```

Nenhum outro campo sera alterado. Apenas esses dois deixarao de mostrar sugestoes do navegador.

