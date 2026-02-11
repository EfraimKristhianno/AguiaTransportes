

## Expandir o logotipo na tela de login

O logotipo atualmente esta contido em containers pequenos com tamanho fixo. A mudanca vai aumentar esses containers para que a imagem ocupe mais espaco.

### Alteracoes em `src/pages/Index.tsx`

**Desktop (painel esquerdo):**
- Container atual: `h-28 w-56` (112px x 224px)
- Novo container: `h-40 w-80` (160px x 320px) com padding reduzido para maximizar o espaco da imagem

**Mobile (header):**
- Container atual: `h-16 w-32` (64px x 128px)
- Novo container: `h-24 w-48` (96px x 192px)

A imagem ja usa `object-contain` entao ela vai preencher o espaco disponivel mantendo a proporcao.

