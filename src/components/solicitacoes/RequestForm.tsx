 import { useState, useRef } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { Plus, User, Phone, MapPin, Calendar, Upload, X, FileText, Send } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
 import { useMaterialTypes } from '@/hooks/useMaterialTypes';
 import { useTransportTypes, useCreateDeliveryRequest, useUploadAttachment } from '@/hooks/useDeliveryRequests';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { useQuery } from '@tanstack/react-query';
 
 const requestSchema = z.object({
   clientName: z.string().min(1, 'Nome do cliente é obrigatório'),
   phone: z.string().optional(),
   email: z.string().email('Email inválido').optional().or(z.literal('')),
   requester: z.string().optional(),
   originAddress: z.string().min(1, 'Endereço de coleta é obrigatório'),
   destinationAddress: z.string().min(1, 'Endereço de entrega é obrigatório'),
   scheduledDate: z.string().optional(),
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
   const [attachments, setAttachments] = useState<File[]>([]);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
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
         .single();
       if (error) return null;
       return data;
     },
     enabled: !!user?.email && role === 'cliente',
   });
 
   const isClient = role === 'cliente';
 
   const form = useForm<RequestFormData>({
     resolver: zodResolver(requestSchema),
     defaultValues: {
       clientName: '',
       phone: '',
       email: '',
       requester: '',
       originAddress: '',
       destinationAddress: '',
       scheduledDate: '',
       materialTypeId: '',
       transportType: '',
       notes: '',
     },
     values: isClient && userProfile ? {
       clientName: userProfile.name || '',
       phone: userProfile.phone || '',
       email: userProfile.email || '',
       requester: '',
       originAddress: '',
       destinationAddress: '',
       scheduledDate: '',
       materialTypeId: '',
       transportType: '',
       notes: '',
     } : undefined,
   });
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     setAttachments(prev => [...prev, ...files]);
   };
 
   const removeAttachment = (index: number) => {
     setAttachments(prev => prev.filter((_, i) => i !== index));
   };
 
   const onSubmit = async (data: RequestFormData) => {
     setIsSubmitting(true);
     try {
       // Upload attachments
       const uploadedPaths: string[] = [];
       for (const file of attachments) {
         const path = await uploadAttachment.mutateAsync(file);
         uploadedPaths.push(path);
       }
 
       // Create or find client
       let clientId = clientRecord?.id;
       
       if (!clientId && !isClient) {
         // For admin/gestor, find or create client by email
         const { data: existingClient } = await supabase
           .from('clients')
           .select('id')
           .eq('email', data.email)
           .single();
 
         if (existingClient) {
           clientId = existingClient.id;
         } else if (data.email) {
           const { data: newClient, error } = await supabase
             .from('clients')
             .insert({
               name: data.clientName,
               phone: data.phone || null,
               email: data.email || null,
             })
             .select('id')
             .single();
           
           if (!error && newClient) {
             clientId = newClient.id;
           }
         }
       }
 
       await createRequest.mutateAsync({
         client_id: clientId,
         origin_address: data.originAddress,
         destination_address: data.destinationAddress,
         scheduled_date: data.scheduledDate || null,
         material_type_id: data.materialTypeId,
         transport_type: data.transportType,
         notes: data.notes || null,
         requester: data.requester || null,
         attachments: uploadedPaths,
         status: 'enviada',
       });
 
       // Reset form
       form.reset();
       setAttachments([]);
       onSuccess?.();
     } catch (error) {
       console.error('Error creating request:', error);
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleClear = () => {
     form.reset();
     setAttachments([]);
   };
 
   return (
     <div className="bg-card rounded-lg border p-6">
       <div className="flex items-center gap-2 mb-6">
         <Plus className="h-5 w-5 text-primary" />
         <h2 className="text-lg font-semibold">Nova Solicitação de Coleta</h2>
       </div>
 
       <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           {/* Client Info Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
               control={form.control}
               name="clientName"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nome do cliente</FormLabel>
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
                   <FormLabel>Telefone</FormLabel>
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
                   <FormLabel>Tipo de material *</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <FormControl>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione" />
                       </SelectTrigger>
                     </FormControl>
                     <SelectContent>
                       {materialTypes.map((type) => (
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
                   <FormLabel>Tipo de transporte *</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <FormControl>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione" />
                       </SelectTrigger>
                     </FormControl>
                     <SelectContent>
                       {transportTypes.map((type) => (
                         <SelectItem key={type} value={type}>
                           {type}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <FormMessage />
                 </FormItem>
               )}
             />
           </div>
 
           {/* Origin Address */}
           <FormField
             control={form.control}
             name="originAddress"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Endereço de coleta</FormLabel>
                 <FormControl>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input {...field} placeholder="Digite o endereço completo" className="pl-9" />
                   </div>
                 </FormControl>
                 <p className="text-xs text-muted-foreground">Funcionalidade de mapa será implementada em breve</p>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           {/* Destination Address */}
           <FormField
             control={form.control}
             name="destinationAddress"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Endereço de entrega</FormLabel>
                 <FormControl>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input {...field} placeholder="Digite o endereço completo" className="pl-9" />
                   </div>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
 
           {/* Requester and Date */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
               control={form.control}
               name="requester"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Solicitante</FormLabel>
                   <FormControl>
                     <Input {...field} placeholder="Nome do solicitante" />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="scheduledDate"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Data da solicitação</FormLabel>
                   <FormControl>
                     <div className="relative">
                       <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input {...field} type="datetime-local" className="pl-9" />
                     </div>
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           </div>
 
           {/* Attachments */}
           <div>
             <Label>Anexos (fotos, documentos, vídeos)</Label>
             <div
               className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
               onClick={() => fileInputRef.current?.click()}
             >
               <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
               <p className="text-sm text-muted-foreground">
                 Clique para selecionar ou arraste arquivos
               </p>
               <input
                 ref={fileInputRef}
                 type="file"
                 multiple
                 className="hidden"
                 onChange={handleFileSelect}
                 accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
               />
             </div>
 
             {attachments.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-3">
                 {attachments.map((file, index) => (
                   <div
                     key={index}
                     className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-sm"
                   >
                     <FileText className="h-4 w-4" />
                     <span className="max-w-[150px] truncate">{file.name}</span>
                     <button
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         removeAttachment(index);
                       }}
                       className="text-muted-foreground hover:text-foreground"
                     >
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                 ))}
               </div>
             )}
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