

## Aplicar Novo Tema tweakcn.com

### O que sera feito

Substituir completamente o tema atual (baseado em HSL) pelo novo tema fornecido (baseado em OKLCH), atualizando cores, fontes, sombras e border-radius em toda a aplicacao.

### Alteracoes

**1. `src/index.css` -- Substituir variaveis CSS**
- Trocar todas as variaveis `:root` e `.dark` pelas novas variaveis OKLCH fornecidas
- Manter as classes utilitarias customizadas (hero-gradient, feature-card, etc.) mas atualizar suas referencias de cor para o novo primary
- Adicionar import das fontes Google: Plus Jakarta Sans, Lora e Roboto Mono (substituindo Inter)
- Atualizar o `font-family` do body para usar Plus Jakarta Sans

**2. `tailwind.config.ts` -- Atualizar mapeamento de cores**
- Trocar `hsl(var(--...))` por `oklch(var(--...))` em todas as referencias de cor (background, foreground, primary, secondary, etc.)
- Atualizar fontFamily para Plus Jakarta Sans, Lora e Roboto Mono
- Manter keyframes, animacoes e container inalterados

**3. `index.html` -- Adicionar fontes**
- Adicionar link do Google Fonts para Plus Jakarta Sans, Lora e Roboto Mono no `<head>`

### Observacoes importantes

- O bloco `@theme inline` fornecido e especifico do Tailwind CSS v4. Como este projeto usa Tailwind v3, esse bloco sera ignorado -- as variaveis serao mapeadas diretamente via `tailwind.config.ts`
- As variaveis customizadas `--aguia-red`, `--gradient-hero`, `--shadow-card` etc. serao removidas ou atualizadas para usar o novo primary OKLCH
- O `--radius` muda de `1rem` para `1.2rem`, aumentando levemente o arredondamento dos componentes
- O `--spacing` muda de `0.25rem` para `0.23rem`

