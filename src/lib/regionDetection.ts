/**
 * Detects the region from an address string.
 * Uses city name matching from the formatted address (Nominatim format: "Rua, Número - Bairro - Cidade - Estado")
 */

const CURITIBA_PATTERN = /curitiba/i;
const ARAUCARIA_PATTERN = /arauc[aá]ria/i;

// Known cities in the metropolitan region of Curitiba
const METROPOLITANA_CITIES = [
  /s[aã]o\s*jos[eé]\s*dos\s*pinhais/i,
  /colombo/i,
  /pinhais/i,
  /campo\s*largo/i,
  /almirante\s*tamandar[eé]/i,
  /fazenda\s*rio\s*grande/i,
  /piraquara/i,
  /quatro\s*barras/i,
  /campina\s*grande\s*do\s*sul/i,
  /bocai[uú]va\s*do\s*sul/i,
  /itaperu[cç]u/i,
  /rio\s*branco\s*do\s*sul/i,
  /campo\s*magro/i,
  /mandirituba/i,
  /contenda/i,
  /balsa\s*nova/i,
  /lapa/i,
];

export type FreightRegion = 'Curitiba' | 'Araucária' | 'Metropolitana';

export const detectRegionFromAddress = (address: string | null | undefined): FreightRegion | null => {
  if (!address) return null;
  
  if (CURITIBA_PATTERN.test(address)) return 'Curitiba';
  if (ARAUCARIA_PATTERN.test(address)) return 'Araucária';
  
  // Check for known metropolitan cities
  for (const pattern of METROPOLITANA_CITIES) {
    if (pattern.test(address)) return 'Metropolitana';
  }
  
  // Address doesn't contain a recognized city — region is unknown
  return null;
};

/**
 * Detects region from destination address (used for freight pricing)
 * @deprecated Use resolveFreightRegion instead
 */
export const detectRegionForFreight = (destinationAddress: string | null | undefined): FreightRegion | null => {
  return detectRegionFromAddress(destinationAddress);
};

/**
 * Resolves the effective freight region based on BOTH origin and destination addresses.
 * 
 * Rules:
 * 1. Metropolitana/Araucária → Curitiba = price for Metropolitana/Araucária
 * 2. Curitiba → Metropolitana/Araucária = price for Metropolitana/Araucária
 * 3. Curitiba → Curitiba = price for Curitiba
 * 4. Any address outside recognized regions = null (means "A combinar")
 * 
 * Priority: the "farthest" region wins (Metropolitana/Araucária > Curitiba).
 */
export const resolveFreightRegion = (
  originAddress: string | null | undefined,
  destinationAddress: string | null | undefined
): FreightRegion | null => {
  const originRegion = detectRegionFromAddress(originAddress);
  const destRegion = detectRegionFromAddress(destinationAddress);

  // If either address can't be detected, freight is "A combinar"
  if (!originRegion || !destRegion) return null;

  // If both are Curitiba, use Curitiba pricing
  if (originRegion === 'Curitiba' && destRegion === 'Curitiba') return 'Curitiba';

  // If either is Araucária, use Araucária pricing
  if (originRegion === 'Araucária' || destRegion === 'Araucária') return 'Araucária';

  // If either is Metropolitana, use Metropolitana pricing
  if (originRegion === 'Metropolitana' || destRegion === 'Metropolitana') return 'Metropolitana';

  return null;
};
