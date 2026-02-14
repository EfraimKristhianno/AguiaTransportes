/**
 * Detects the region from an address string.
 * Uses city name matching from the formatted address (Nominatim format: "Rua, Número - Bairro - Cidade - Estado")
 */

const CURITIBA_PATTERN = /curitiba/i;
const ARAUCARIA_PATTERN = /arauc[aá]ria/i;

export type FreightRegion = 'Curitiba' | 'Araucária' | 'Metropolitana';

export const detectRegionFromAddress = (address: string | null | undefined): FreightRegion | null => {
  if (!address) return null;
  
  if (CURITIBA_PATTERN.test(address)) return 'Curitiba';
  if (ARAUCARIA_PATTERN.test(address)) return 'Araucária';
  
  // If address has content but doesn't match specific cities, assume Metropolitana
  if (address.trim().length > 0) return 'Metropolitana';
  
  return null;
};

/**
 * Detects region from destination address (used for freight pricing)
 */
export const detectRegionForFreight = (destinationAddress: string | null | undefined): FreightRegion | null => {
  return detectRegionFromAddress(destinationAddress);
};
