/** Placas legadas que devem ser tratadas como a placa canônica atual */
const PLATE_CANONICAL: Record<string, string> = {
  AJI8I19: 'AJI8I17',
};

/** Normaliza placa para exibição, filtros e agregação (ex.: AJI8I19 → AJI8I17) */
export function canonicalVehiclePlate(plate: string | null | undefined): string {
  if (plate == null || plate === '') return '';
  const u = String(plate).trim().toUpperCase();
  return PLATE_CANONICAL[u] ?? u;
}

/** Compara duas placas considerando aliases */
export function platesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return canonicalVehiclePlate(a) === canonicalVehiclePlate(b);
}
