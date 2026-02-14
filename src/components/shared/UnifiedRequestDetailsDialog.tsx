import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin, Phone, User, Package, Truck, Calendar, FileText,
  Navigation, Loader2, Hash, Check, Circle,
  X, ChevronRight, ChevronDown, Send, Eye, Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRequestHistory } from '@/hooks/useRequestHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptDeliveryRequest } from '@/hooks/useDriverRequests';
import { useUpdateRequestStatus, useUploadStatusAttachment } from '@/hooks/useUpdateRequestStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { AttachmentItem } from '@/components/shared/AttachmentItem';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';

interface RequestData {
  id: string;
  request_number: number | null;
  client_id?: string | null;
  origin_address: string;
  destination_address: string;
  scheduled_date: string | null;
  material_type_id?: string | null;
  driver_id?: string | null;
  vehicle_id?: string | null;
  status: string | null;
  notes: string | null;
  delivered_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  requester: string | null;
  requester_phone?: string | null;
  invoice_number?: string | null;
  op_number?: string | null;
  transport_type: string | null;
  attachments?: string[] | null;
  clients?: { name: string; phone?: string | null; email?: string | null } | null;
  material_types?: { name: string } | null;
  drivers?: { name: string } | null;
}

interface UnifiedRequestDetailsDialogProps {
  request: RequestData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId?: string | null;
}

const STATUS_FLOW = [
  { value: 'solicitada', label: 'Solicitada', icon: FileText },
  { value: 'aceita', label: 'Aceita', icon: Check },
  { value: 'coletada', label: 'Coletada', icon: Package },
  { value: 'em_rota', label: 'Em Trânsito', icon: Truck },
  { value: 'entregue', label: 'Entregue', icon: Check },
];

const getStatusClassName = (status: string | null) => {
  switch (status) {
    case 'solicitada': case 'enviada': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'aceita': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'coletada': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'em_rota': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'entregue': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'solicitada': case 'enviada': return 'Solicitada';
    case 'aceita': return 'Aceita';
    case 'coletada': return 'Coletada';
    case 'em_rota': return 'Em Trânsito';
    case 'entregue': return 'Entregue';
    default: return status || 'Solicitada';
  }
};

// Geocoding & distance
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(address)}`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    return null;
  } catch { return null; }
};

const distanceCache = new Map<string, string>();

export const UnifiedRequestDetailsDialog = ({
  request,
  open,
  onOpenChange,
  driverId,
}: UnifiedRequestDetailsDialogProps) => {
  const { role } = useAuth();
  const isDriver = role === 'motorista';
  const isAdmin = role === 'admin';
  const isAdminOrGestor = role === 'admin' || role === 'gestor';
  const [adminSelectedStatus, setAdminSelectedStatus] = useState<string>('');
  const acceptMutation = useAcceptDeliveryRequest();
  const updateStatusMutation = useUpdateRequestStatus();
  const uploadMutation = useUploadStatusAttachment();

  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState<string>('Calculando...');
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [notesText, setNotesText] = useState('');
  const [stepNotesText, setStepNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [driverStepDialogOpen, setDriverStepDialogOpen] = useState(false);
  
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // Manual close handler - the ONLY way to close this dialog
  const handleClose = () => {
    onOpenChange(false);
  };

  const { data: history = [], isLoading: isLoadingHistory } = useRequestHistory(
    open && request ? request.id : null
  );

  // Distance calculation
  useEffect(() => {
    if (!request || !open) return;
    const cached = distanceCache.get(request.id);
    if (cached) { setEstimatedDistance(cached); return; }

    let cancelled = false;
    const calculate = async () => {
      setEstimatedDistance('Calculando...');
      const [o, d] = await Promise.all([
        geocodeAddress(request.origin_address),
        geocodeAddress(request.destination_address),
      ]);
      if (cancelled) return;
      if (o && d) {
        const dist = haversineDistance(o.lat, o.lon, d.lat, d.lon);
        const result = `${dist.toFixed(1)} km`;
        distanceCache.set(request.id, result);
        setEstimatedDistance(result);
      } else {
        setEstimatedDistance('Não disponível');
      }
    };
    calculate();
    return () => { cancelled = true; };
  }, [request?.id, open]);

  // Reset state when dialog opens/closes or request changes
  useEffect(() => {
    if (!open) {
      setPendingFiles([]);
      setExpandedSteps({});
      setStepNotesText('');
      setDriverStepDialogOpen(false);
      setAdminSelectedStatus('');
    } else if (request) {
      setNotesText(request.notes || '');
    }
  }, [open, request?.id]);


  if (!request) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.value === request.status);
  const canAccept = isDriver && driverId && (request.status === 'solicitada' || request.status === 'enviada');
  const isAssignedDriver = isDriver && driverId && request.driver_id;

  // Next status for driver progression
  const getNextStatus = () => {
    if (!isAssignedDriver) return null;
    const nextMap: Record<string, string> = {
      aceita: 'coletada',
      coletada: 'em_rota',
      em_rota: 'entregue',
    };
    return request.status ? nextMap[request.status] || null : null;
  };

  const nextStatus = getNextStatus();
  const nextStatusLabel = nextStatus ? STATUS_FLOW.find(s => s.value === nextStatus)?.label : null;

  const handleAccept = async () => {
    if (!driverId) return;
    setIsAccepting(true);
    try {
      await acceptMutation.mutateAsync({ requestId: request.id, driverId });
      const paths: string[] = [];
      for (const entry of pendingFiles) {
        const path = await uploadMutation.mutateAsync({ file: entry.file, requestId: request.id });
        paths.push(path);
      }
      if (paths.length > 0 || stepNotesText) {
        const { data: historyEntries } = await supabase
          .from('delivery_request_status_history')
          .select('id')
          .eq('delivery_request_id', request.id)
          .eq('status', 'aceita')
          .order('changed_at', { ascending: false })
          .limit(1);
        if (historyEntries && historyEntries.length > 0) {
          const historyUpdate: Record<string, unknown> = {};
          if (paths.length > 0) historyUpdate.attachments = paths;
          if (stepNotesText) historyUpdate.notes = stepNotesText;
          await supabase
            .from('delivery_request_status_history')
            .update(historyUpdate)
            .eq('id', historyEntries[0].id);
        }
      }
      setPendingFiles([]);
      setStepNotesText('');
      handleClose();
    } catch (error: any) {
      if (error?.message?.includes('já foi aceita')) {
        queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
        queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
        handleClose();
      }
    } finally { setIsAccepting(false); }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    setIsUpdatingStatus(true);
    try {
      const paths: string[] = [];
      for (const entry of pendingFiles) {
        const path = await uploadMutation.mutateAsync({ file: entry.file, requestId: request.id });
        paths.push(path);
      }
      await updateStatusMutation.mutateAsync({
        requestId: request.id,
        status: nextStatus,
        attachmentPaths: paths,
        notes: stepNotesText || undefined,
      });
      setPendingFiles([]);
      setStepNotesText('');
      handleClose();
    } catch {
      // errors handled by mutation
    } finally { setIsUpdatingStatus(false); }
  };

  const removeFile = (id: string) => {
    setPendingFiles(prev => prev.filter((f) => f.id !== id));
  };

  const handleSaveNotes = async () => {
    if (!request) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ notes: notesText, updated_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
      toast.success('Observações salvas!');
    } catch (err: any) {
      toast.error(`Erro ao salvar observações: ${err.message}`);
    } finally {
      setIsSavingNotes(false);
    }
  };


  const toggleStep = (stepValue: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepValue]: !prev[stepValue] }));
  };


  // History by status for timeline
  const historyByStatus: Record<string, { changed_at: string; notes: string | null; attachments?: string[] }> = {};
  history.forEach((entry: any) => {
    const existing = historyByStatus[entry.status];
    if (!existing) {
      historyByStatus[entry.status] = {
        changed_at: entry.changed_at,
        notes: entry.notes,
        attachments: entry.attachments || [],
      };
    } else {
      // Merge: prefer entry with notes/attachments (handles duplicate trigger entries)
      if (entry.notes && !existing.notes) existing.notes = entry.notes;
      if (entry.attachments && entry.attachments.length > 0 && (!existing.attachments || existing.attachments.length === 0)) {
        existing.attachments = entry.attachments;
      }
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={() => { /* Block ALL Radix auto-close - only manual close allowed */ }}>
         <DialogContent
          className="max-w-lg w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden [&>button:last-child]:hidden rounded-xl sm:rounded-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => handleClose()}
          aria-describedby={undefined}
        >
          {/* Custom close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
          <ScrollArea className="max-h-[90vh]">
            <div className="p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-primary" />
                  <span className="font-mono font-bold text-primary">
                    #{String(request.request_number || '').padStart(6, '0')}
                  </span>
                  <Badge variant="outline" className={getStatusClassName(request.status)}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Client Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Cliente
                </h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{request.clients?.name || 'Não informado'}</p>
                  {request.clients?.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" /> {request.clients.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Material and Transport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" /> Material
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{request.material_types?.name || '-'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Transporte
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{request.transport_type || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Requester and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Solicitante</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{request.requester || '-'}</p>
                    {request.requester_phone && (
                      <a href={`tel:${request.requester_phone}`} className="text-xs text-primary flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {request.requester_phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Data
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-sm">{formatDate(request.scheduled_date || request.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Invoice and OP */}
              {(request.invoice_number || request.op_number) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Nota Fiscal
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium">{request.invoice_number || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4" /> O.P.
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium">{request.op_number || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Addresses */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" /> Endereço de Coleta
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-medium text-green-800">{request.origin_address}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" /> Endereço de Entrega
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-medium text-red-800">{request.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Distância Estimada</span>
                </div>
                <span className="text-lg font-bold text-primary">{estimatedDistance}</span>
              </div>

              {/* Observações - editable for non-drivers, read-only for drivers */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Observações
                </h4>
                {isDriver ? (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{request.notes || <span className="text-muted-foreground italic">Nenhuma observação</span>}</p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="Adicione observações sobre esta coleta..."
                      className="min-h-[80px] resize-none"
                    />
                    {notesText !== (request.notes || '') && (
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="w-full"
                        variant="outline"
                      >
                        {isSavingNotes ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Salvar Observações</>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Anexos do solicitante */}
              {request.attachments && Array.isArray(request.attachments) && (request.attachments as string[]).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-muted-foreground">Anexos</h4>
                  </div>
                  <div className="grid gap-2">
                    {(request.attachments as string[]).map((path, index) => (
                      <AttachmentItem key={path} path={path} index={index} />
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Acompanhamento</h4>
                {isLoadingHistory ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, i) => (
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
                      const isExpanded = expandedSteps[step.value] || false;

                      return (
                        <div key={step.value} className="flex items-start gap-3 relative">
                          {!isLast && (
                            <div className={`absolute left-[13px] top-[28px] w-0.5 ${isExpanded ? 'h-full' : 'h-8'} ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                          )}
                          <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                            isCompleted ? 'bg-primary border-primary text-primary-foreground'
                              : isCurrent ? 'border-primary bg-background text-primary'
                                : 'border-border bg-muted text-muted-foreground'
                          }`}>
                            {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                          </div>
                          <div className={`pb-8 flex-1 ${isPending ? 'opacity-40' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>{step.label}</p>
                                {historyEntry ? (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(historyEntry.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Pendente</p>
                                )}
                              </div>
                              {isCompleted && (
                                <button
                                  onClick={() => toggleStep(step.value)}
                                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors p-1 rounded-md hover:bg-muted"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (historyEntry || step.value === 'solicitada') && (() => {
                              const isSolicitada = step.value === 'solicitada';
                              const stepNotes = isSolicitada ? request.notes : historyEntry?.notes;
                              const stepAttachments = isSolicitada
                                ? (Array.isArray(request.attachments) ? request.attachments as string[] : [])
                                : (historyEntry?.attachments || []);
                              const stepDate = isSolicitada
                                ? request.created_at
                                : historyEntry?.changed_at;

                              return (
                                <div className="mt-2 space-y-2 bg-muted/50 rounded-lg p-3 border border-border">
                                  {stepDate && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Data e hora:</p>
                                      <p className="text-sm">
                                        {format(new Date(stepDate), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                      </p>
                                    </div>
                                  )}
                                  {stepNotes ? (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
                                      <p className="text-sm">{stepNotes}</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
                                      <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada</p>
                                    </div>
                                  )}
                                  {stepAttachments && stepAttachments.length > 0 ? (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">
                                        Anexos ({stepAttachments.length}):
                                      </p>
                                      <div className="space-y-1.5">
                                        {stepAttachments.map((attachment: string, idx: number) => (
                                          <AttachmentItem key={idx} path={attachment} index={idx} />
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Anexos:</p>
                                      <p className="text-sm text-muted-foreground italic">Nenhum anexo registrado</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Admin/Gestor Actions - Change Status */}
              {isAdminOrGestor && request.status !== 'entregue' && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Alterar Status</h4>
                  <div className="flex items-center gap-2">
                    <Select value={adminSelectedStatus} onValueChange={setAdminSelectedStatus}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.filter(s => s.value !== request.status).map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!adminSelectedStatus || isUpdatingStatus}
                      onClick={async () => {
                        if (!adminSelectedStatus) return;
                        setIsUpdatingStatus(true);
                        try {
                          await updateStatusMutation.mutateAsync({
                            requestId: request.id,
                            status: adminSelectedStatus,
                          });
                          setAdminSelectedStatus('');
                          handleClose();
                        } catch {
                          // handled by mutation
                        } finally {
                          setIsUpdatingStatus(false);
                        }
                      }}
                    >
                      {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Alterar'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Driver Actions - Accept */}
              {canAccept && (
                <div className="space-y-3 border-t pt-4">
                   <div className="flex items-center gap-2">
                    <Button onClick={handleAccept} className="flex-1 h-12 text-base" disabled={isAccepting}>
                      {isAccepting ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Aceitando...</>
                      ) : 'Aceitar Coleta'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setDriverStepDialogOpen(true)}
                      title="Adicionar observação e anexos"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  {(pendingFiles.length > 0 || stepNotesText) && (
                    <p className="text-xs text-muted-foreground italic">
                      {stepNotesText ? '📝 Observação adicionada' : ''}
                      {stepNotesText && pendingFiles.length > 0 ? ' • ' : ''}
                      {pendingFiles.length > 0 ? `📎 ${pendingFiles.length} arquivo(s)` : ''}
                    </p>
                  )}
                </div>
              )}

              {isAssignedDriver && nextStatus && (
                <div className="space-y-3 border-t pt-4">
                   <div className="flex items-center gap-2">
                    <Button
                      onClick={handleUpdateStatus}
                      className="flex-1 h-12 text-base"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Atualizando...</>
                      ) : (
                        <>Confirmar: {nextStatusLabel}</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setDriverStepDialogOpen(true)}
                      title="Adicionar observação e anexos"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  {(pendingFiles.length > 0 || stepNotesText) && (
                    <p className="text-xs text-muted-foreground italic">
                      {stepNotesText ? '📝 Observação adicionada' : ''}
                      {stepNotesText && pendingFiles.length > 0 ? ' • ' : ''}
                      {pendingFiles.length > 0 ? `📎 ${pendingFiles.length} arquivo(s)` : ''}
                    </p>
                  )}
                </div>
              )}

              {request.status === 'entregue' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <Check className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-sm font-medium text-emerald-700">Entrega concluída</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Driver Step Dialog - observation & attachments popup */}
      <Dialog open={driverStepDialogOpen} onOpenChange={() => { /* Block auto-close during file picker on mobile */ }}>
        <DialogContent
          className="max-w-md w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto rounded-xl [&>button:last-child]:hidden"
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detalhes da Etapa
            </DialogTitle>
          </DialogHeader>
          {/* Manual close button */}
          <button
            onClick={() => setDriverStepDialogOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>

          {request && (
            <div className="space-y-4 mt-2">
              {/* Request summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary text-sm">
                    #{String(request.request_number || '').padStart(6, '0')}
                  </span>
                  <Badge variant="outline" className={getStatusClassName(request.status)}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Cliente:</span> {request.clients?.name || '-'}</p>
                  <p><span className="text-muted-foreground">Material:</span> {request.material_types?.name || '-'}</p>
                  <p><span className="text-muted-foreground">Transporte:</span> {request.transport_type || '-'}</p>
                </div>
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                    <p>{request.origin_address}</p>
                  </div>
                  <div className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                    <p>{request.destination_address}</p>
                  </div>
                </div>
                {request.notes && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs font-medium mb-1">Observações da solicitação:</p>
                      <p>{request.notes}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Observation field */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Observação da etapa</p>
                <Textarea
                  value={stepNotesText}
                  onChange={(e) => setStepNotesText(e.target.value)}
                  placeholder="Adicione uma observação para esta etapa..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* File upload area */}
              <FileUploadArea files={pendingFiles} onFilesChange={setPendingFiles} />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDriverStepDialogOpen(false)}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};
