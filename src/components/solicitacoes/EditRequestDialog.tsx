import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, FileText, Hash, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMaterialTypes } from '@/hooks/useMaterialTypes';
import { useTransportTypes } from '@/hooks/useDeliveryRequests';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AddressAutocomplete } from '@/components/solicitacoes/AddressAutocomplete';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';
import { AttachmentItem } from '@/components/shared/AttachmentItem';

const editSchema = z.object({
  originAddress: z.string().min(1, 'Endereço de coleta é obrigatório'),
  destinationAddress: z.string().min(1, 'Endereço de entrega é obrigatório'),
  invoiceNumber: z.string().optional(),
  opNumber: z.string().optional(),
  scheduledDate: z.string().optional(),
  materialTypeId: z.string().min(1, 'Tipo de material é obrigatório'),
  transportType: z.string().min(1, 'Tipo de transporte é obrigatório'),
  notes: z.string().optional(),
  requester: z.string().optional(),
  requesterPhone: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditRequestDialogProps {
  request: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditRequestDialog = ({ request, open, onOpenChange }: EditRequestDialogProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { data: materialTypes = [] } = useMaterialTypes();
  const { data: transportTypes = [] } = useTransportTypes();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      originAddress: '',
      destinationAddress: '',
      invoiceNumber: '',
      opNumber: '',
      scheduledDate: '',
      materialTypeId: '',
      transportType: '',
      notes: '',
      requester: '',
      requesterPhone: '',
    },
  });

  useEffect(() => {
    if (request && open) {
      form.reset({
        originAddress: request.origin_address || '',
        destinationAddress: request.destination_address || '',
        invoiceNumber: request.invoice_number || '',
        opNumber: request.op_number || '',
        scheduledDate: request.scheduled_date || '',
        materialTypeId: request.material_type_id || '',
        transportType: request.transport_type || '',
        notes: request.notes || '',
        requester: request.requester || '',
        requesterPhone: request.requester_phone || '',
      });
      setExistingAttachments(
        Array.isArray(request.attachments) ? (request.attachments as string[]) : []
      );
      setPendingFiles([]);
    }
  }, [request, open, form]);

  const onSubmit = async (data: EditFormData) => {
    if (!request?.id) return;
    setIsSaving(true);
    try {
      // Upload new files
      const newPaths: string[] = [];
      for (const entry of pendingFiles) {
        const filePath = `${request.id}/status-attachments/${Date.now()}-${entry.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('request-attachments')
          .upload(filePath, entry.file);
        if (uploadError) throw uploadError;
        newPaths.push(filePath);
      }

      const allAttachments = [...existingAttachments, ...newPaths];

      const { error } = await supabase
        .from('delivery_requests')
        .update({
          origin_address: data.originAddress,
          destination_address: data.destinationAddress,
          invoice_number: data.invoiceNumber || null,
          op_number: data.opNumber || null,
          scheduled_date: data.scheduledDate || null,
          material_type_id: data.materialTypeId,
          transport_type: data.transportType,
          notes: data.notes || null,
          requester: data.requester || null,
          requester_phone: data.requesterPhone || null,
          attachments: allAttachments,
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Solicitação atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequestDetail'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao atualizar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const dateValue = form.watch('scheduledDate');
  const parsedDate = dateValue ? new Date(dateValue) : undefined;
  const timeValue = dateValue ? format(new Date(dateValue), 'HH:mm') : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Editar Solicitação #{String(request?.request_number || '').padStart(6, '0')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="requester" render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <FormControl><Input {...field} placeholder="Nome do solicitante" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="requesterPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone solicitante</FormLabel>
                  <FormControl><Input {...field} placeholder="(00) 00000-0000" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="originAddress" render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço de coleta *</FormLabel>
                <FormControl>
                  <AddressAutocomplete value={field.value} onChange={field.onChange} placeholder="Endereço de coleta" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="destinationAddress" render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço de entrega *</FormLabel>
                <FormControl>
                  <AddressAutocomplete value={field.value} onChange={field.onChange} placeholder="Endereço de entrega" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota Fiscal</FormLabel>
                  <FormControl><Input {...field} placeholder="Número da NF" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="opNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>O.P.</FormLabel>
                  <FormControl><Input {...field} placeholder="Número da O.P." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="materialTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de material *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {materialTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="transportType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de transporte *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {transportTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="scheduledDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Data agendada</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedDate}
                      onSelect={(day) => {
                        if (!day) { field.onChange(''); return; }
                        const [h, m] = (timeValue || '08:00').split(':').map(Number);
                        day.setHours(h, m);
                        field.onChange(day.toISOString());
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                    <div className="border-t px-3 py-2 flex items-center gap-2">
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => {
                          const time = e.target.value;
                          const base = parsedDate || new Date();
                          const [h, m] = time.split(':').map(Number);
                          base.setHours(h, m, 0, 0);
                          field.onChange(base.toISOString());
                        }}
                        className="w-28"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea {...field} placeholder="Observações adicionais" rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {/* Anexos existentes */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Anexos existentes</FormLabel>
                <div className="grid gap-2">
                  {existingAttachments.map((path, index) => (
                    <div key={path} className="flex items-center gap-2">
                      <div className="flex-1">
                        <AttachmentItem path={path} index={index} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 px-2"
                        onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== index))}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Novos anexos */}
            <div className="space-y-2">
              <FormLabel>Adicionar anexos</FormLabel>
              <FileUploadArea files={pendingFiles} onFilesChange={setPendingFiles} />
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
