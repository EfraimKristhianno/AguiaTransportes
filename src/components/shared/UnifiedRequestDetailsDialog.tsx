import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin, Phone, User, Package, Truck, Calendar, FileText,
  Navigation, Loader2, Hash, Check, Circle, Camera, Paperclip,
  X, ChevronRight, Image as ImageIcon, Film, File, Send,
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
  const acceptMutation = useAcceptDeliveryRequest();
  const updateStatusMutation = useUpdateRequestStatus();
  const uploadMutation = useUploadStatusAttachment();

  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState<string>('Calculando...');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      onOpenChange(false);
    } finally { setIsAccepting(false); }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    setIsUpdatingStatus(true);
    try {
      // Upload pending files
      const paths: string[] = [];
      for (const file of pendingFiles) {
        const path = await uploadMutation.mutateAsync(file);
        paths.push(path);
      }
      await updateStatusMutation.mutateAsync({
        requestId: request.id,
        status: nextStatus,
        attachmentPaths: paths,
      });
      setPendingFiles([]);
      onOpenChange(false);
    } catch {
      // errors handled by mutation
    } finally { setIsUpdatingStatus(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Film className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // History by status for timeline
  const historyByStatus: Record<string, { changed_at: string; notes: string | null; attachments?: string[] }> = {};
  history.forEach((entry: any) => {
    if (!historyByStatus[entry.status]) {
      historyByStatus[entry.status] = {
        changed_at: entry.changed_at,
        notes: entry.notes,
        attachments: entry.attachments || [],
      };
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Solicitante</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{request.requester || '-'}</p>
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

              {/* Observações - editable */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Observações
                </h4>
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
              </div>

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

                      return (
                        <div key={step.value} className="flex items-start gap-3 relative">
                          {!isLast && (
                            <div className={`absolute left-[13px] top-[28px] w-0.5 h-8 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                          )}
                          <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                            isCompleted ? 'bg-primary border-primary text-primary-foreground'
                              : isCurrent ? 'border-primary bg-background text-primary'
                                : 'border-border bg-muted text-muted-foreground'
                          }`}>
                            {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                          </div>
                          <div className={`pb-8 ${isPending ? 'opacity-40' : ''}`}>
                            <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>{step.label}</p>
                            {historyEntry ? (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(historyEntry.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Pendente</p>
                            )}
                            {historyEntry?.attachments && historyEntry.attachments.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {historyEntry.attachments.length} anexo(s)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Driver Actions */}
              {canAccept && (
                <Button onClick={handleAccept} className="w-full" disabled={isAccepting}>
                  {isAccepting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aceitando...</>
                  ) : 'Aceitar Coleta'}
                </Button>
              )}

              {isAssignedDriver && nextStatus && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    Atualizar para: <span className="text-primary">{nextStatusLabel}</span>
                  </h4>

                  {/* File upload area */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,application/pdf,.doc,.docx"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 border-dashed"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Tirar Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Anexar Arquivo
                      </Button>
                    </div>

                    {pendingFiles.length > 0 && (
                      <div className="space-y-1">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 text-sm"
                          >
                            {getFileIcon(file)}
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleUpdateStatus}
                    className="w-full"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Atualizando...</>
                    ) : (
                      <>Confirmar: {nextStatusLabel}</>
                    )}
                  </Button>
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
  );
};
