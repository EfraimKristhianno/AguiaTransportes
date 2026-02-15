
# Melhorar Autocomplete de Enderecos com API Open Source (Photon)

## Problema
A API Nominatim (OpenStreetMap) atual nao retorna todos os enderecos esperados, especialmente para locais no Brasil. Ela foi projetada para geocodificacao, nao para autocomplete.

## Solucao
Substituir o Nominatim pelo **Photon** (https://photon.komoot.io), uma API open source gratuita mantida pela Komoot, baseada nos dados do OpenStreetMap mas otimizada especificamente para autocomplete. Vantagens:
- Busca fuzzy (tolera erros de digitacao)
- Mais rapida que Nominatim
- Sem limites rigorosos de uso
- Sem necessidade de chave de API
- Melhor cobertura para buscas parciais

## Alteracoes

### Arquivo: `src/components/solicitacoes/AddressAutocomplete.tsx`

1. Trocar a URL de `nominatim.openstreetmap.org/search` para `photon.komoot.io/api`
2. Adicionar parametro `lang=pt` e filtro por Brasil (`&osm_tag=place` com bias para coordenadas do Brasil)
3. Adaptar a interface de resultado do Photon (formato GeoJSON) para extrair rua, numero, bairro, cidade e estado
4. Manter toda a logica de UI existente (debounce, navegacao por teclado, dropdown)

## Secao Tecnica

### Formato da API Photon
Endpoint: `https://photon.komoot.io/api?q=QUERY&lang=pt&limit=5&lat=-25.4&lon=-49.3`
- `lat/lon` faz bias para regiao de Curitiba/PR (nao filtra, apenas prioriza)
- Retorna GeoJSON com `properties.name`, `properties.street`, `properties.housenumber`, `properties.district`, `properties.city`, `properties.state`

### Mapeamento de campos
- `properties.street` -> Rua
- `properties.housenumber` -> Numero
- `properties.district` ou `properties.locality` -> Bairro
- `properties.city` -> Cidade
- `properties.state` -> Estado
- Formato final: `Rua, Numero - Bairro - Cidade - Estado`

### Nenhuma Edge Function necessaria
A API Photon e publica e gratuita, sem necessidade de chave. A chamada sera feita diretamente do componente, igual ao Nominatim atual.
