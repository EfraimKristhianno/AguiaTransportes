-- Fix incorrectly stored km values (20.000 was saved as 20 due to number input treating dot as decimal)
-- Multiply by 1000 to restore correct values: 20 → 20000, 20.15 → 20150, 20.25 → 20250
UPDATE vehicle_logs SET km_final = km_final * 1000 WHERE km_final < 1000;
UPDATE oil_change_records SET km_at_change = km_at_change * 1000 WHERE km_at_change < 1000;
UPDATE oil_change_records SET next_change_km = next_change_km * 1000 WHERE next_change_km < 1000;
UPDATE maintenance_records SET current_km = current_km * 1000 WHERE current_km < 1000;