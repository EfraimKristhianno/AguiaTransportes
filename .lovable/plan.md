

## Problem

The request #000006 from client **Telekomm** with transport type **Caminhão (3/4)** shows no freight value because the `freight_prices` table has no rows for client_id `c854bff9-ed2f-48e8-8df1-e4d29ac8a568`. All other clients have Caminhão (3/4) prices configured (R$ 470,00), but Telekomm was never added.

## Solution

Insert freight price records for the **Telekomm** client into the `freight_prices` table. Based on the existing pattern for other clients with Caminhão (3/4), we need entries for all transport types and regions that Telekomm uses.

### Steps

1. **Query existing transport types and regions** used across the `freight_prices` table to replicate the full pricing structure for Telekomm.
2. **Create a migration** that inserts all necessary `freight_prices` rows for client `c854bff9-ed2f-48e8-8df1-e4d29ac8a568`, matching the standard pricing (R$ 470,00 for Caminhão 3/4 in Curitiba and Metropolitana, plus any other transport types if applicable).

### Technical Detail

The issue is purely a data gap — no code changes needed. The region detection correctly resolves "Metropolitana" for this request (origin Curitiba, destination Pinhais). The `getFreightPricesForRequest` function correctly filters by `client_id` + `transport_type` + `region`, but returns empty because no rows exist for Telekomm.

