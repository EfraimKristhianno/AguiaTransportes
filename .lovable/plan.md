

## Aplicar novo tema do tweakcn.com

### O que sera feito

Atualizar as variaveis CSS no arquivo `src/index.css` com os novos valores de tema fornecidos.

### Alteracoes

**`src/index.css`** - Atualizar as variaveis `:root` com os novos valores:

Diferencas principais no modo claro (`:root`):
- `--background`: de `0.9232` para `0.9158`
- `--border`: de `0.8687 0.0043 56.3660` para `0.9067 0 0`
- `--input`: de `0.8687 0.0043 56.3660` para `0.7889 0 0`
- `--sidebar-accent`: de `0.9376 0.0260 321.9388` para `0.9146 0.0025 345.2172`

O modo escuro (`.dark`) permanece praticamente igual.

### Nota tecnica

O bloco `@theme inline` fornecido e uma funcionalidade do Tailwind CSS v4. Este projeto usa Tailwind v3 com `@tailwind base/components/utilities`, entao esse bloco **nao sera adicionado** pois causaria erros. As variaveis CSS ja sao mapeadas pelo `tailwind.config.ts` existente, que cumpre a mesma funcao.

O comando `npx shadcn@latest add` tambem nao sera executado diretamente, pois o tema sera aplicado manualmente atraves das variaveis CSS -- resultado identico e mais seguro.

### Arquivo alterado
- `src/index.css` (unico arquivo)

