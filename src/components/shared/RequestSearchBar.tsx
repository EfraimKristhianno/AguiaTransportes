import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'coletada', label: 'Coletada' },
  { value: 'em_rota', label: 'Em Trânsito' },
  { value: 'entregue', label: 'Entregue' },
];

interface RequestSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  placeholder?: string;
}

export const RequestSearchBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  placeholder = 'Buscar por ID, cliente, material, NF ou O.P...',
}: RequestSearchBarProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

/**
 * Utility function to filter requests by search term.
 * Works with any object that has these optional fields.
 */
export const filterRequestsBySearch = (
  requests: any[],
  searchTerm: string,
  statusFilter: string,
): any[] => {
  return requests.filter(request => {
    // Status filter
    let matchesStatus = statusFilter === 'all' || statusFilter === 'todos';
    if (!matchesStatus) {
      if (statusFilter === 'solicitada') {
        matchesStatus = request.status === 'solicitada' || request.status === 'enviada';
      } else {
        matchesStatus = request.status === statusFilter;
      }
    }

    if (!matchesStatus) return false;

    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const requestNumber = String(request.request_number || '');
    const clientName = (request.clients?.name || request.client?.name || '').toLowerCase();
    const materialName = (request.material_types?.name || request.material_type?.name || '').toLowerCase();
    const invoiceNumber = (request.invoice_number || '').toLowerCase();
    const opNumber = (request.op_number || '').toLowerCase();

    return (
      requestNumber.includes(search) ||
      clientName.includes(search) ||
      materialName.includes(search) ||
      invoiceNumber.includes(search) ||
      opNumber.includes(search)
    );
  });
};
