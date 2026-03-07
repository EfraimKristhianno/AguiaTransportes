import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

function formatAddress(feature: PhotonFeature, userNumber?: string): string {
  const p = feature.properties;
  const parts: string[] = [];

  // Street + number (prefer API number, fallback to user-typed number)
  const street = p.street || p.name;
  if (street) {
    const number = p.housenumber || userNumber;
    parts.push(number ? `${street}, ${number}` : street);
  }

  // Neighborhood
  const bairro = p.district || p.locality;
  if (bairro) parts.push(bairro);

  // City
  if (p.city) parts.push(p.city);

  // State
  if (p.state) parts.push(p.state);

  return parts.join(' - ');
}

function extractNumber(query: string): string | undefined {
  // Match numbers like "123", "1500" etc. in the query (common patterns: "Rua X, 123" or "Rua X 123")
  const match = query.match(/[,\s]\s*(\d{1,6})\b/);
  return match ? match[1] : undefined;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = 'Digite o endereço',
  className,
  disabled,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [skipNextSearch, setSkipNextSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const number = extractNumber(query);

    try {
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=7&countrycodes=br&viewbox=-54.6,-27.0,-48.0,-22.5&bounded=0`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const nominatimData = await nominatimRes.json();
      
      let features: PhotonFeature[] = (nominatimData || []).map((item: any) => ({
        properties: {
          name: item.address?.road || item.name,
          street: item.address?.road,
          housenumber: item.address?.house_number,
          district: item.address?.suburb || item.address?.neighbourhood,
          locality: item.address?.village || item.address?.town,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          country: item.address?.country,
        }
      }));

      if (features.length < 3) {
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&lang=default&limit=5&lat=-25.4&lon=-49.3`
          );
          const photonData = await photonRes.json();
          const photonFeatures: PhotonFeature[] = photonData.features || [];

          const existingAddresses = new Set(features.map(f => formatAddress(f, number)));
          for (const pf of photonFeatures) {
            const addr = formatAddress(pf, number);
            if (!existingAddresses.has(addr) && addr.length > 5) {
              features.push(pf);
              existingAddresses.add(addr);
            }
          }
        } catch {
          // Photon fallback failed
        }
      }

      features = features.filter(f => formatAddress(f, number).length > 5).slice(0, 7);

      setSuggestions(features);
      setIsOpen(features.length > 0);
      setHighlightedIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (skipNextSearch) {
      setSkipNextSearch(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const selectSuggestion = (feature: PhotonFeature) => {
    const hasNumber = !!feature.properties.housenumber;
    const number = extractNumber(value);
    const formatted = formatAddress(feature, number);
    
    if (hasNumber || number) {
      // Address already has a number, just set it
      onChange(formatted);
      setIsOpen(false);
      setSuggestions([]);
    } else {
      // No number - add ", " after street name so user can type the number
      const street = feature.properties.street || feature.properties.name || '';
      const rest = formatted.replace(street, '').replace(/^\s*-\s*/, '');
      // Store the rest to append after user types number
      const withComma = `${street}, `;
      onChange(withComma);
      setIsOpen(false);
      setSuggestions([]);
      setSkipNextSearch(true);
      
      // Store the remaining address parts to append later
      containerRef.current?.setAttribute('data-rest', rest ? ` - ${rest}` : '');
      
      // Focus input and place cursor at end
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(withComma.length, withComma.length);
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={cn('pl-9', className)}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((result, index) => (
            <li
              key={index}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
              onMouseDown={() => selectSuggestion(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{formatAddress(result, userNumber)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
