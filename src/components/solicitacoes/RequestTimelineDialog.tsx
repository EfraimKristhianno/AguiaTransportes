import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRequestHistory } from '@/hooks/useRequestHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Circle, MapPin, User, Package, Truck, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_FLOW = [
  { value: 'solicitada', label: 'Solicitada', icon: FileText },
  { value: 'aceita', label: 'Aceita', icon: Check },
  { value: 'coletada', label: 'Coletada', icon: Package },
  { value: 'em_rota', label: 'Em Trânsito', icon: Truck },
  { value: 'entregue', label: 'Entregue', icon: Check },
];

interface RequestData {
  id: string;
  request_number: number;
  status: string | null;
  origin_address: string;
  destination_address: string;
  notes: string | null;
  transport_type: string | null;
  scheduled_date: string | null;
  clients?: { name: string; phone?: string | null } | null;
  material_types?: { name: string } | null;
  drivers?: { name: string } | null;
}

interface RequestTimelineDialogProps {
  request: RequestData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestTimelineDialog = ({ request, open, onOpenChange }: RequestTimelineDialogProps) => {
  const { data: history = [], isLoading } = useRequestHistory(request?.id ?? null);

  if (!request) return null;

  // Map history entries by status for quick lookup
  const historyByStatus: Record<string, { changed_at: string; notes: string | null; attachments?: string[] }> = {};
  history.forEach((entry) => {
    const existing = historyByStatus[entry.status];
    if (!existing) {
      historyByStatus[entry.status] = { changed_at: entry.changed_at, notes: entry.notes, attachments: entry.attachments || [] };
    } else {
      // Merge: prefer entry with notes/attachments (handles duplicate trigger entries)
      if (entry.notes && !existing.notes) existing.notes = entry.notes;
      if (entry.attachments && entry.attachments.length > 0 && (!existing.attachments || existing.attachments.length === 0)) {
        existing.attachments = entry.attachments;
      }
    }
  });

  // Determine current step index
  const currentStatusIndex = STATUS_FLOW.findIndex((s) => s.value === request.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-primary">
              #{String(request.request_number || '').padStart(6, '0')}
            </span>
            <span className="text-muted-foreground font-normal text-sm">
              {request.clients?.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Request summary */}
        <div className="space-y-2 text-sm border-b pb-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{request.material_types?.name || 'Material não especificado'}</span>
            {request.transport_type && (
              <span className="text-muted-foreground">• {request.transport_type}</span>
            )}
          </div>
          {request.drivers && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Motorista: {request.drivers.name}</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-foreground">{request.origin_address}</p>
              <p>→ {request.destination_address}</p>
            </div>
          </div>
          {request.notes && (
            <p className="text-muted-foreground italic text-xs">Obs: {request.notes}</p>
          )}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="space-y-4 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative py-2">
            {STATUS_FLOW.map((step, index) => {
              const historyEntry = historyByStatus[step.value];
              const isCompleted = !!historyEntry;
              const isCurrent = index === currentStatusIndex;
              const isPending = !isCompleted && !isCurrent;
              const isLast = index === STATUS_FLOW.length - 1;
              const StepIcon = step.icon;

              return (
                <div key={step.value} className="flex items-start gap-3 relative">
                  {/* Vertical line */}
                  {!isLast && (
                    <div
                      className={`absolute left-[13px] top-[28px] w-0.5 h-8 ${
                        isCompleted ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}

                  {/* Circle indicator */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isCurrent
                        ? 'border-primary bg-background text-primary'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Label + date */}
                  <div className={`pb-8 ${isPending ? 'opacity-40' : ''}`}>
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>
                      {step.label}
                    </p>
                    {historyEntry ? (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(historyEntry.changed_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Pendente</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
