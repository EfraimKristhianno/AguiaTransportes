import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, brazilNowISO } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

interface SavedAddress {
  id: string;
  address: string;
  used_count: number;
}

type SuggestionItem = 
  | { type: 'saved'; address: string }
  | { type: 'api'; feature: PhotonFeature };

function formatAddress(feature: PhotonFeature, userNumber?: string): string {
  const p = feature.properties;
  const parts: string[] = [];

  const street = p.street || p.name;
  if (street) {
    const number = p.housenumber || userNumber;
    parts.push(number ? `${street}, ${number}` : street);
  }

  const bairro = p.district || p.locality;
  if (bairro) parts.push(bairro);

  if (p.city) parts.push(p.city);
  if (p.state) parts.push(p.state);

  return parts.join(' - ');
}

function extractNumber(query: string): string | undefined {
  const match = query.match(/[,\s]\s*(\d{1,6})\b/);
  return match ? match[1] : undefined;
}

// Save address to history (upsert: increment count if exists)
export async function saveAddressToHistory(address: string) {
  if (!address || address.length < 5) return;
  
  const trimmed = address.trim();
  
  // Try to find existing
  const { data: existing } = await supabase
    .from('address_history')
    .select('id, used_count')
    .ilike('address', trimmed)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('address_history')
      .update({ 
        used_count: existing.used_count + 1, 
        last_used_at: brazilNowISO() 
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('address_history')
      .insert({ address: trimmed });
  }
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = 'Digite o endereço',
  className,
  disabled,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [skipNextSearch, setSkipNextSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch saved addresses matching query
  const fetchSavedAddresses = useCallback(async (query: string): Promise<SavedAddress[]> => {
    if (query.length < 2) return [];
    try {
      const { data } = await supabase
        .from('address_history')
        .select('id, address, used_count')
        .ilike('address', `%${query}%`)
        .order('used_count', { ascending: false })
        .order('last_used_at', { ascending: false })
        .limit(5);
      return (data || []) as SavedAddress[];
    } catch {
      return [];
    }
  }, []);

  // Show saved addresses on focus (most used)
  const fetchTopAddresses = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('address_history')
        .select('id, address, used_count')
        .order('used_count', { ascending: false })
        .order('last_used_at', { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        const items: SuggestionItem[] = data.map(d => ({ type: 'saved', address: d.address }));
        setSuggestions(items);
        setIsOpen(true);
        setHighlightedIndex(-1);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const number = extractNumber(query);

    // Fetch saved and API results in parallel
    const [savedAddresses, nominatimData] = await Promise.all([
      fetchSavedAddresses(query),
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=br&viewbox=-54.6,-27.0,-48.0,-22.5&bounded=0`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      ).then(r => r.json()).catch(() => [])
    ]);

    const items: SuggestionItem[] = [];
    const addedAddresses = new Set<string>();

    // Add saved addresses first (priority)
    for (const saved of savedAddresses) {
      const lower = saved.address.toLowerCase();
      if (!addedAddresses.has(lower)) {
        items.push({ type: 'saved', address: saved.address });
        addedAddresses.add(lower);
      }
    }

    // Add API results
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

    // Supplement with Photon if few results
    if (features.length < 3) {
      try {
        const photonRes = await fetch(
          `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&lang=default&limit=5&lat=-25.4&lon=-49.3`
        );
        const photonData = await photonRes.json();
        const photonFeatures: PhotonFeature[] = photonData.features || [];
        for (const pf of photonFeatures) {
          const addr = formatAddress(pf, number);
          if (!addedAddresses.has(addr.toLowerCase()) && addr.length > 5) {
            features.push(pf);
          }
        }
      } catch {
        // Photon fallback failed
      }
    }

    for (const f of features) {
      const addr = formatAddress(f, number);
      const lower = addr.toLowerCase();
      if (!addedAddresses.has(lower) && addr.length > 5) {
        items.push({ type: 'api', feature: f });
        addedAddresses.add(lower);
      }
    }

    setSuggestions(items.slice(0, 8));
    setIsOpen(items.length > 0);
    setHighlightedIndex(-1);
  }, [fetchSavedAddresses]);

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

  const getSuggestionText = (item: SuggestionItem): string => {
    if (item.type === 'saved') return item.address;
    return formatAddress(item.feature, extractNumber(value));
  };

  const selectSuggestion = (item: SuggestionItem) => {
    if (item.type === 'saved') {
      onChange(item.address);
      setIsOpen(false);
      setSuggestions([]);
      return;
    }

    const feature = item.feature;
    const hasNumber = !!feature.properties.housenumber;
    const number = extractNumber(value);
    const formatted = formatAddress(feature, number);
    
    if (hasNumber || number) {
      onChange(formatted);
      setIsOpen(false);
      setSuggestions([]);
    } else {
      const street = feature.properties.street || feature.properties.name || '';
      const withComma = `${street}, `;
      onChange(withComma);
      setIsOpen(false);
      setSuggestions([]);
      setSkipNextSearch(true);
      
      const rest = formatted.replace(street, '').replace(/^\s*-\s*/, '');
      containerRef.current?.setAttribute('data-rest', rest ? ` - ${rest}` : '');
      
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

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    } else if (!value || value.length < 3) {
      // Show top saved addresses on focus when field is empty
      fetchTopAddresses();
    }
  };

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
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn('pl-9', className)}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((item, index) => (
            <li
              key={index}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
              onMouseDown={() => selectSuggestion(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-2">
                {item.type === 'saved' ? (
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <span>{getSuggestionText(item)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
