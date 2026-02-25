

# Plano: Acompanhamento em Tempo Real do Motorista (Estilo Uber)

## Visao Geral

Implementar rastreamento GPS do motorista com visualizacao em mapa interativo (Leaflet/OpenStreetMap) para gestores e administradores acompanharem entregas em andamento. O mapa aparecera dentro de um Dialog, acessivel por um icone de mapa na tabela de motoristas.

---

## Arquitetura Tecnica

### 1. Tabela de localizacao no banco de dados

Criar tabela `driver_locations` com:
- `id` (uuid, PK)
- `driver_id` (uuid, FK -> drivers.id)
- `delivery_request_id` (uuid, FK -> delivery_requests.id)
- `latitude` (double precision)
- `longitude` (double precision)
- `heading` (double precision, nullable) - direcao do motorista
- `speed` (double precision, nullable)
- `updated_at` (timestamptz, default now())

Politica RLS: motoristas podem INSERT/UPDATE sua propria localizacao; admin/gestor podem SELECT todas.

Adicionar a tabela ao `supabase_realtime` publication para atualizacoes em tempo real.

### 2. Envio de localizacao pelo motorista (Frontend)

Criar hook `useDriverLocationTracking`:
- Usa `navigator.geolocation.watchPosition()` para capturar GPS continuamente
- Envia coordenadas para `driver_locations` via upsert a cada ~10 segundos
- Ativa automaticamente quando o motorista tem corrida com status `aceita`, `coletada` ou `em_rota`
- Para de rastrear quando nao ha corridas ativas
- Integrar no componente `DriverRequestsTable` ou no layout do motorista

### 3. Mapa de acompanhamento (Leaflet + OpenStreetMap)

Criar componente `DriverTrackingDialog`:
- Usa biblioteca `react-leaflet` (gratuita, sem API key)
- Exibe mapa com tiles do OpenStreetMap
- Mostra marcador do motorista (icone de carro/caminhao) com posicao em tempo real
- Mostra marcadores de origem (verde) e destino (vermelho) da entrega
- Linha tracada entre origem, posicao atual do motorista e destino
- Card sobreposto com info: nome do motorista, status, tempo estimado
- Escuta mudancas via Supabase Realtime na tabela `driver_locations`

### 4. Integracao na tela de Motoristas (Admin/Gestor)

Na tabela de motoristas (`Motoristas.tsx`), adicionar:
- Coluna com icone `MapPin` para motoristas com corridas ativas (`active_deliveries > 0`)
- Ao clicar, abre o `DriverTrackingDialog` com o mapa da entrega em andamento
- O botao so aparece quando o motorista tem corrida ativa

### 5. Dependencias a instalar

- `leaflet` + `react-leaflet` - biblioteca de mapas
- `@types/leaflet` - tipos TypeScript

### 6. Arquivos a criar/modificar

**Novos:**
- `supabase/migrations/XXXX_create_driver_locations.sql` - tabela + RLS + realtime
- `src/hooks/useDriverLocationTracking.ts` - envio GPS do motorista
- `src/hooks/useDriverLocation.ts` - leitura em tempo real da posicao
- `src/components/motoristas/DriverTrackingDialog.tsx` - dialog com mapa Leaflet

**Modificados:**
- `src/pages/Motoristas.tsx` - adicionar coluna de mapa na tabela admin/gestor
- `src/components/motoristas/DriverRequestsTable.tsx` - ativar tracking quando motorista tem corrida ativa
- `src/integrations/supabase/types.ts` - tipos da nova tabela

### 7. Fluxo de dados

```text
Motorista (GPS)
    |
    v
navigator.geolocation.watchPosition()
    |
    v (upsert a cada 10s)
driver_locations (Supabase)
    |
    v (Realtime subscription)
DriverTrackingDialog (Admin/Gestor)
    |
    v
Mapa Leaflet com marcador animado
```

### 8. Visual do mapa (inspirado na imagem)

- Fundo cinza do OpenStreetMap
- Icone de veiculo na posicao do motorista
- Marcador de destino com label "Chegada" e tempo estimado (calculado por distancia/velocidade)
- Linha de rota entre motorista e destino
- Dialog com titulo "Acompanhar Entrega - #000001" e info do motorista

