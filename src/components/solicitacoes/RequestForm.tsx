import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, User, Phone, CalendarIcon, FileText, Send, Hash, Clock, Check, CalendarPlus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMaterialTypes } from '@/hooks/useMaterialTypes';
import { useTransportTypes, useCreateDeliveryRequest, useUploadAttachment } from '@/hooks/useDeliveryRequests';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import VehicleDetailsPopover from '@/components/VehicleDetailsPopover';
import { AddressAutocomplete } from '@/components/solicitacoes/AddressAutocomplete';
import { resolveFreightRegion, detectRegionFromAddress } from '@/lib/regionDetection';
import { Badge } from '@/components/ui/badge';

const requestSchema = z.object({
  clientName: z.string().min(1, 'Nome do cliente é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  requester: z.string().min(1, 'Solicitante é obrigatório'),
  requesterPhone: z.string().min(1, 'Telefone do solicitante é obrigatório'),
  originAddress: z.string().min(1, 'Endereço de coleta é obrigatório'),
  originCompany: z.string().optional(),
  destinationAddress: z.string().min(1, 'Endereço de entrega é obrigatório'),
  destinationCompany: z.string().optional(),
  invoiceNumber: z.string().optional(),
  opNumber: z.string().optional(),
  scheduledDate: z.string().min(1, 'Data da solicitação é obrigatória'),
  materialTypeId: z.string().min(1, 'Tipo de material é obrigatório'),
  transportType: z.string().min(1, 'Tipo de transporte é obrigatório'),
  notes: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  onSuccess?: () => void;
}

export const RequestForm = ({ onSuccess }: RequestFormProps) => {
  const { user, role } = useAuth();
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [schedulingDate, setSchedulingDate] = useState<Date | undefined>(undefined);
  const [schedulingTime, setSchedulingTime] = useState<string>('');
  const [schedulingCalendarOpen, setSchedulingCalendarOpen] = useState(false);
  const [schedulingStatus, setSchedulingStatus] = useState<string>('');
  const [showScheduling, setShowScheduling] = useState(false);

  const { data: materialTypes = [] } = useMaterialTypes();
  const { data: transportTypes = [] } = useTransportTypes();
  const createRequest = useCreateDeliveryRequest();
  const uploadAttachment = useUploadAttachment();

  // Fetch current user's profile data
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('name, phone, email')
        .eq('auth_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Fetch client record if exists
  const { data: clientRecord } = useQuery({
    queryKey: ['clientRecord', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.email && role === 'cliente',
    refetchOnWindowFocus: false,
  });

  // Get next request number for display
  const { data: nextRequestNumber } = useQuery({
    queryKey: ['nextRequestNumber'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select('request_number')
        .order('request_number', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return 1;
      return (data[0].request_number || 0) + 1;
    },
    refetchOnWindowFocus: false,
  });

  const isClient = role === 'cliente';

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      clientName: '',
      phone: '',
      email: '',
      requester: '',
      requesterPhone: '',
      originAddress: '',
      originCompany: '',
      destinationAddress: '',
      destinationCompany: '',
      invoiceNumber: '',
      opNumber: '',
      scheduledDate: '',
      materialTypeId: '',
      transportType: '',
      notes: '',
    },
  });

  // Auto-fill client data when profile loads
  useEffect(() => {
    if (isClient && userProfile) {
      form.setValue('clientName', userProfile.name || '');
      form.setValue('phone', userProfile.phone || '');
      form.setValue('email', userProfile.email || '');
    }
  }, [isClient, userProfile, form]);

  // Track selected client ID for admin/gestor freight price lookup
  const watchedClientName = form.watch('clientName');
  const { data: selectedClientByName } = useQuery({
    queryKey: ['clientByName', watchedClientName],
    queryFn: async () => {
      if (!watchedClientName) return null;
      const { data } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', watchedClientName)
        .maybeSingle();
      return data;
    },
    enabled: !isClient && !!watchedClientName,
    refetchOnWindowFocus: false,
  });

  const selectedClientId = isClient ? clientRecord?.id : selectedClientByName?.id;


  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true);
    try {
      // Create or find client - essential for RLS to work
      let clientId = clientRecord?.id;
      // Normalize email to lowercase for case-insensitive matching with RLS policies
      const emailToUse = (isClient ? user?.email : data.email)?.toLowerCase() || undefined;
      
      if (!clientId) {
        if (emailToUse) {
          // Find existing client by email (case-insensitive via ilike)
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .ilike('email', emailToUse)
            .maybeSingle();

          if (existingClient) {
            clientId = existingClient.id;
          }
        }
        
        if (!clientId) {
          // Try to find by name if no email match
          if (!emailToUse) {
            const { data: existingByName } = await supabase
              .from('clients')
              .select('id')
              .eq('name', data.clientName)
              .maybeSingle();
            if (existingByName) {
              clientId = existingByName.id;
            }
          }
        }

        if (!clientId) {
          // Create new client record
          const { data: newClient, error } = await supabase
            .from('clients')
            .insert({
              name: data.clientName,
              phone: data.phone || null,
              email: emailToUse || null,
            })
            .select('id')
            .single();
          
          if (!error && newClient) {
            clientId = newClient.id;
          } else {
            console.error('Error creating client:', error);
            throw new Error('Não foi possível criar o registro do cliente. Verifique suas permissões.');
          }
        }
      }

      if (!clientId) {
        throw new Error('Não foi possível identificar o cliente para a solicitação.');
      }

      // Detect region from both origin and destination addresses
      const detectedRegion = resolveFreightRegion(data.originAddress, data.destinationAddress);

      // 1. Create the request first (without attachments)
      const createdRequest = await createRequest.mutateAsync({
        client_id: clientId,
        origin_address: data.originAddress,
        origin_company: data.originCompany || null,
        destination_address: data.destinationAddress,
        destination_company: data.destinationCompany || null,
        scheduled_date: data.scheduledDate || null,
        material_type_id: data.materialTypeId,
        transport_type: data.transportType,
        notes: data.notes || null,
        requester: data.requester || null,
        requester_phone: data.requesterPhone || null,
        invoice_number: data.invoiceNumber || null,
        op_number: data.opNumber || null,
        attachments: [],
        status: 'solicitada',
        region: detectedRegion,
      } as any);

      // 2. Upload attachments using the requestId in the path (required by RLS)
      if (attachments.length > 0 && createdRequest?.id) {
        const uploadedPaths: string[] = [];
        for (const entry of attachments) {
          const fileExt = entry.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${createdRequest.id}/status-attachments/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(filePath, entry.file);

          if (uploadError) throw uploadError;
          uploadedPaths.push(filePath);
        }

        // 3. Update the request with attachment paths
        await supabase
          .from('delivery_requests')
          .update({ attachments: uploadedPaths })
          .eq('id', createdRequest.id);
      }

      // Send push notification to drivers
      try {
        await supabase.functions.invoke('notify-driver', {
          body: {
            request_number: createdRequest?.request_number,
            origin_address: data.originAddress,
            destination_address: data.destinationAddress,
            transport_type: data.transportType,
          },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
      // Reset form (keep client data for clients)
      if (isClient) {
        form.reset({
          clientName: userProfile?.name || '',
          phone: userProfile?.phone || '',
          email: userProfile?.email || '',
          requester: '',
          requesterPhone: '',
          originAddress: '',
          originCompany: '',
          destinationAddress: '',
          destinationCompany: '',
          invoiceNumber: '',
          opNumber: '',
          scheduledDate: '',
          materialTypeId: '',
          transportType: '',
          notes: '',
        });
      } else {
        form.reset();
      }
      setAttachments([]);
      setSchedulingDate(undefined);
      setSchedulingTime('');
      setSchedulingStatus('');
      setShowScheduling(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    if (isClient) {
      form.reset({
        clientName: userProfile?.name || '',
        phone: userProfile?.phone || '',
        email: userProfile?.email || '',
        requester: '',
        requesterPhone: '',
        originAddress: '',
        originCompany: '',
        destinationAddress: '',
        destinationCompany: '',
        invoiceNumber: '',
        opNumber: '',
        scheduledDate: '',
        materialTypeId: '',
        transportType: '',
        notes: '',
      });
    } else {
      form.reset();
    }
    setAttachments([]);
    setSchedulingDate(undefined);
    setSchedulingTime('');
    setSchedulingStatus('');
    setShowScheduling(false);
  };

  return (
    <div className="bg-card rounded-lg border p-4 md:p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-6">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Nova Solicitação de Coleta</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const missingFields = Object.values(errors).map(e => e?.message).filter(Boolean);
            if (missingFields.length > 0) {
              toast({
                title: 'Campos obrigatórios não preenchidos',
                description: missingFields.join(', '),
                variant: 'destructive',
              });
            }
          })} className="space-y-4">
          {/* ID da Solicitação */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">ID da Solicitação:</span>
            <span className="text-sm text-muted-foreground">
              #{String(nextRequestNumber || 1).padStart(6, '0')}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">(gerado automaticamente)</span>
          </div>

          {/* Client Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cliente <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        placeholder="Seu nome" 
                        className="pl-9"
                        disabled={isClient}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        placeholder="(00) 00000-0000" 
                        className="pl-9"
                        disabled={isClient}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Material and Transport Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="materialTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de material <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...materialTypes]
                        .sort((a, b) => {
                          if (a.name === 'Outros') return 1;
                          if (b.name === 'Outros') return -1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transportType"
              render={({ field }) => (
                <FormItem>
                   <div className="flex items-center gap-2">
                     <FormLabel>Tipo de transporte <span className="text-red-500">*</span></FormLabel>
                     {field.value && (
                       <VehicleDetailsPopover vehicleType={field.value} clientId={clientRecord?.id || selectedClientId} />
                     )}
                   </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transportTypes.map((type) => (
                         <SelectItem key={type} value={type} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <span>{type}</span>
                             <VehicleDetailsPopover vehicleType={type} triggerClassName="ml-auto" clientId={clientRecord?.id || selectedClientId} />
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Date, Scheduling Date and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => {
                const formatLocalISO = (d: Date): string => {
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  const seconds = String(d.getSeconds()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                };

                const parseLocalDate = (str: string): Date => {
                  const [datePart, timePart] = str.split('T');
                  const [y, mo, d] = datePart.split('-').map(Number);
                  if (timePart) {
                    const [h, mi, s] = timePart.split(':').map(Number);
                    return new Date(y, mo - 1, d, h, mi, s || 0);
                  }
                  return new Date(y, mo - 1, d);
                };

                const dateValue = field.value ? parseLocalDate(field.value) : undefined;
                const timeValue = field.value ? format(parseLocalDate(field.value), 'HH:mm') : '';

                const handleDateSelect = (day: Date | undefined) => {
                  if (!day) { field.onChange(''); return; }
                  const [hours, minutes] = (timeValue || format(new Date(), 'HH:mm')).split(':').map(Number);
                  day.setHours(hours, minutes, 0, 0);
                  field.onChange(formatLocalISO(day));
                };

                const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const time = e.target.value;
                  const base = dateValue ? new Date(dateValue) : new Date();
                  const [h, m] = time.split(':').map(Number);
                  base.setHours(h, m, 0, 0);
                  field.onChange(formatLocalISO(base));
                };

                const handleConfirmDateTime = () => {
                  if (!field.value) {
                    const now = new Date();
                    field.onChange(formatLocalISO(now));
                  }
                  setCalendarOpen(false);
                };

                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data da solicitação <span className="text-red-500">*</span></FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(parseLocalDate(field.value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                              : "Selecione a data"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateValue}
                          onSelect={handleDateSelect}
                          defaultMonth={dateValue || new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          locale={ptBR}
                        />
                        <div className="border-t px-3 py-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={timeValue}
                            onChange={handleTimeChange}
                            className="w-auto"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary hover:text-primary/80"
                            onClick={handleConfirmDateTime}
                            title="Confirmar data e hora"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Botão Agendar Coleta */}
            {!showScheduling && (
              <FormItem className="flex flex-col">
                <FormLabel className="invisible">Agendar</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5"
                  onClick={() => setShowScheduling(true)}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Agendar coleta
                </Button>
              </FormItem>
            )}
          </div>

          {/* Campos de agendamento (visíveis apenas ao clicar) */}
          {showScheduling && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              {/* Data do agendamento */}
              <FormItem className="flex flex-col">
                <FormLabel>Data do agendamento</FormLabel>
                <Popover open={schedulingCalendarOpen} onOpenChange={setSchedulingCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !schedulingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {schedulingDate
                        ? `${format(schedulingDate, "dd/MM/yyyy", { locale: ptBR })}${schedulingTime ? ` às ${schedulingTime}` : ''}`
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={schedulingDate}
                      onSelect={(day) => setSchedulingDate(day)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                    />
                    <div className="border-t px-3 py-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={schedulingTime}
                        onChange={(e) => setSchedulingTime(e.target.value)}
                        className="w-auto"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary hover:text-primary/80"
                        onClick={() => {
                          if (!schedulingDate) setSchedulingDate(new Date());
                          setSchedulingCalendarOpen(false);
                        }}
                        title="Confirmar data e hora"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </FormItem>

              {/* Status agendada */}
              <FormItem className="flex flex-col">
                <FormLabel>Status agendamento</FormLabel>
                <Select
                  value={schedulingStatus || undefined}
                  onValueChange={(val) => setSchedulingStatus(val === '__clear__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="__clear__" className="text-muted-foreground">Limpar seleção</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>

              {/* Fechar agendamento */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setShowScheduling(false);
                  setSchedulingDate(undefined);
                  setSchedulingTime('');
                  setSchedulingStatus('');
                }}
                title="Remover agendamento"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Requester Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="requester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do solicitante" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requesterPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do solicitante <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} placeholder="(00) 00000-0000" className="pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Origin Address + Company */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="originAddress"
                render={({ field }) => (
                <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Endereço de coleta <span className="text-red-500">*</span></FormLabel>
                      {field.value && (() => {
                        const originRegion = detectRegionFromAddress(field.value);
                        return (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            {originRegion ? `Região: ${originRegion}` : 'A combinar'}
                          </Badge>
                        );
                      })()}
                    </div>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite o endereço de coleta"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="originCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa (coleta)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da empresa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Destination Address + Company */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => {
                  const destRegion = detectRegionFromAddress(field.value);
                  return (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Endereço de entrega <span className="text-red-500">*</span></FormLabel>
                        {field.value && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            {destRegion ? `Região: ${destRegion}` : 'A combinar'}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Digite o endereço de entrega"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <FormField
              control={form.control}
              name="destinationCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa (entrega)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da empresa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* NF and OP fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota Fiscal</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} placeholder="Número da NF" className="pl-9" autoComplete="off" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O.P.</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número da O.P." autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Informações adicionais sobre a coleta..."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


          {/* Attachments */}
          <FileUploadArea files={attachments} onFilesChange={setAttachments} />

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
