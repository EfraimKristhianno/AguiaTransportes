import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Format a numeric string with dot thousand separators (pt-BR style).
 * "30000" → "30.000", "250125" → "250.125"
 */
export function formatKmDisplay(value: number | string | null | undefined): string {
  if (value == null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  if (isNaN(num)) return '';
  return Math.round(num).toLocaleString('pt-BR');
}

/**
 * Parse a formatted km string back to a number.
 * "30.000" → 30000, "250.125" → 250125
 */
export function parseKmValue(formatted: string): number {
  if (!formatted) return 0;
  return parseInt(formatted.replace(/\./g, ''), 10) || 0;
}

interface KmInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Raw string value (unformatted number, e.g. "30000") */
  value: string;
  /** Called with the raw numeric string (no dots) */
  onValueChange: (rawValue: string) => void;
}

/**
 * Input for km values that displays with dot separators.
 * Stores raw number internally, displays formatted.
 */
const KmInput = React.forwardRef<HTMLInputElement, KmInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const formatWithDots = (raw: string): string => {
      const digits = raw.replace(/\D/g, '');
      if (!digits) return '';
      return parseInt(digits, 10).toLocaleString('pt-BR');
    };

    const [displayValue, setDisplayValue] = React.useState(() => formatWithDots(value));

    React.useEffect(() => {
      setDisplayValue(formatWithDots(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const digits = input.replace(/\D/g, '');
      const formatted = digits ? parseInt(digits, 10).toLocaleString('pt-BR') : '';
      setDisplayValue(formatted);
      onValueChange(digits);
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
KmInput.displayName = "KmInput";

export { KmInput };
