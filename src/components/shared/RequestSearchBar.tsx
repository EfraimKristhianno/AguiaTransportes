import { Search, Filter, Download, CalendarIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'coletada', label: 'Coletada' },
  { value: 'em_rota', label: 'Em Trânsito' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelada', label: 'Cancelada' },
];

interface RequestSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  placeholder?: string;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  onDateFromChange?: (date: Date | undefined) => void;
  onDateToChange?: (date: Date | undefined) => void;
  onDownloadPdf?: () => void;
}

export const RequestSearchBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  placeholder = 'Buscar por ID, cliente, motorista, material, NF ou O.P...',
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onDownloadPdf,
}: RequestSearchBarProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + Status */}
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

        {/* Row 2: Date filters + Download */}
        {(onDateFromChange || onDownloadPdf) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {onDateFromChange && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">De:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:w-[160px] justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={onDateFromChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {dateFrom && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateFromChange(undefined)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Até:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:w-[160px] justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={onDateToChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {dateTo && onDateToChange && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateToChange(undefined)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            {onDownloadPdf && (
              <Button variant="outline" onClick={onDownloadPdf} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Utility function to filter requests by search term, status and date range.
 */
export const filterRequestsBySearch = (
  requests: any[],
  searchTerm: string,
  statusFilter: string,
  dateFrom?: Date,
  dateTo?: Date,
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

    // Date range filter
    if (dateFrom || dateTo) {
      const requestDate = request.scheduled_date || request.created_at;
      if (!requestDate) return false;
      const d = new Date(requestDate);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
    }

    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const requestNumber = String(request.request_number || '');
    const clientName = (request.clients?.name || request.client?.name || '').toLowerCase();
    const materialName = (request.material_types?.name || request.material_type?.name || '').toLowerCase();
    const driverName = (request.drivers?.name || request.driver?.name || '').toLowerCase();
    const invoiceNumber = (request.invoice_number || '').toLowerCase();
    const opNumber = (request.op_number || '').toLowerCase();

    return (
      requestNumber.includes(search) ||
      clientName.includes(search) ||
      driverName.includes(search) ||
      materialName.includes(search) ||
      invoiceNumber.includes(search) ||
      opNumber.includes(search)
    );
  });
};
