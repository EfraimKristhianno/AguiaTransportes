import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Predefined plates per vehicle type
const PLATES_BY_TYPE: Record<string, string[]> = {
  'Fiorino': ['DQL2J70', 'DUF9D81', 'MGE9I59'],
  'Caminhão (3/4)': ['AJI8I19'],
};

interface PlateSelectProps {
  vehicleType: string;
  value: string;
  onChange: (plate: string) => void;
}

const PlateSelect = ({ vehicleType, value, onChange }: PlateSelectProps) => {
  const predefinedPlates = PLATES_BY_TYPE[vehicleType] || [];
  const hasPredefined = predefinedPlates.length > 0;
  const isCustom = hasPredefined && value !== '' && !predefinedPlates.includes(value);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);

  // Reset when vehicle type changes
  useEffect(() => {
    setShowCustomInput(false);
  }, [vehicleType]);

  const handleSelectChange = (v: string) => {
    if (v === '__custom__') {
      setShowCustomInput(true);
      onChange('');
    } else {
      setShowCustomInput(false);
      onChange(v);
    }
  };

  // If no predefined plates for this type, show plain input
  if (!hasPredefined) {
    return (
      <div>
        <Label>Placa</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Digite a placa"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Placa</Label>
      <Select
        value={showCustomInput ? '__custom__' : value || undefined}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a placa" />
        </SelectTrigger>
        <SelectContent>
          {predefinedPlates.map((plate) => (
            <SelectItem key={plate} value={plate}>{plate}</SelectItem>
          ))}
          <SelectItem value="__custom__">Outra placa...</SelectItem>
        </SelectContent>
      </Select>
      {showCustomInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Digite a placa"
          autoFocus
        />
      )}
    </div>
  );
};

export default PlateSelect;
export { PLATES_BY_TYPE };
