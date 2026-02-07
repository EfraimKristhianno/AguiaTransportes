

## Correção do Campo de Data da Solicitação

### Problemas Identificados
1. O CSS com `position: absolute` no `::-webkit-calendar-picker-indicator` está fazendo o ícone do calendário sair para fora do campo do formulário
2. O placeholder padrão do navegador mostra "dd/mm/aaaa --:--" em vez de "Selecione a data"

### Solução

**1. Remover o CSS problemático do `src/index.css`**
- Remover completamente as regras CSS que usam `position: absolute` no picker indicator (linhas 141-153)
- Essa abordagem de reposicionar o ícone nativo do navegador causa problemas de layout

**2. Voltar ao ícone manual no `src/components/solicitacoes/RequestForm.tsx`**
- Restaurar o wrapper `<div className="relative">` com o ícone `Calendar` do Lucide posicionado à esquerda
- Manter o input com `className="pl-9"` para dar espaço ao ícone

**3. Substituir o placeholder "dd/mm/aaaa" por "Selecione a data"**
- Usar uma abordagem CSS para esconder o texto padrão do navegador quando o campo está vazio: aplicar `color: transparent` ao input quando não tem valor, e mostrar o placeholder via pseudo-elemento ou usar a propriedade `data-placeholder`
- Alternativa mais simples: adicionar CSS para estilizar o input vazio com `color: gray` e usar o atributo `placeholder`

### Detalhes Técnicos

**`src/index.css`** - Remover linhas 141-153 e adicionar:
```css
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  width: 0;
  height: 0;
}
```
Isso esconde o ícone nativo do navegador para usar o ícone customizado do Lucide.

**`src/components/solicitacoes/RequestForm.tsx`** - Restaurar o layout com ícone:
```tsx
<div className="relative">
  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input 
    {...field} 
    type="datetime-local" 
    className="pl-9" 
    placeholder="Selecione a data"
  />
</div>
```

