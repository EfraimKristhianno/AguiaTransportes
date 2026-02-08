
## Layout Horizontal: Formulario em cima, Lista embaixo

### Mudanca principal

Alterar o layout da pagina de Solicitacoes de **duas colunas lado a lado** (formulario a esquerda, lista a direita) para **layout vertical empilhado** (formulario na parte de cima ocupando toda a largura, barra de busca logo abaixo, e lista de solicitacoes embaixo).

### Alteracoes

**`src/pages/Solicitacoes.tsx`**
- Remover o grid de 2 colunas (`grid-cols-1 lg:grid-cols-2`)
- Substituir por layout vertical (`flex flex-col` ou `space-y-4`) com largura total
- Manter a ordem: RequestForm > barra de busca/filtro > RequestList
- Ajustar a altura da RequestList para funcionar bem no layout empilhado (ex: `h-[500px]` fixo ou similar)

### Detalhes tecnicos

Estrutura resultante:

```text
+--------------------------------------------------+
|  RequestForm (largura total, horizontal)          |
+--------------------------------------------------+
|  Busca + Filtro de status                         |
+--------------------------------------------------+
|  RequestList (largura total, abaixo)              |
+--------------------------------------------------+
```

Apenas o arquivo `src/pages/Solicitacoes.tsx` sera alterado. O formulario e a lista continuam como componentes independentes -- so muda a disposicao no layout pai.
