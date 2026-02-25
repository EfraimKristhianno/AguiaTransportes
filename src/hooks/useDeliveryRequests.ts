 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
export interface DeliveryRequest {
  id: string;
  request_number: number | null;
  client_id: string | null;
  origin_address: string;
  destination_address: string;
  scheduled_date: string | null;
  material_type_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: string | null;
  notes: string | null;
  delivered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  requester: string | null;
  requester_phone: string | null;
  transport_type: string | null;
  invoice_number: string | null;
  op_number: string | null;
  attachments: string[] | null;
  clients?: { name: string; phone: string | null; email: string | null } | null;
  material_types?: { name: string } | null;
  drivers?: { name: string } | null;
}
 
export interface CreateDeliveryRequestInput {
  client_id?: string | null;
  origin_address: string;
  destination_address: string;
  scheduled_date?: string | null;
  material_type_id?: string | null;
  transport_type?: string | null;
  notes?: string | null;
  requester?: string | null;
  requester_phone?: string | null;
  invoice_number?: string | null;
  op_number?: string | null;
  attachments?: string[];
  status?: string;
}
 
 export const useDeliveryRequests = (statusFilter?: string | null) => {
   return useQuery({
      queryKey: ['delivery_requests', statusFilter],
      refetchOnWindowFocus: false,
     queryFn: async (): Promise<DeliveryRequest[]> => {
       let query = supabase
         .from('delivery_requests')
          .select(`
            *,
            clients:client_id (name, phone, email),
            material_types:material_type_id (name),
            drivers:driver_id (name)
          `)
         .order('created_at', { ascending: false });
 
       if (statusFilter && statusFilter !== 'all') {
         query = query.eq('status', statusFilter);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
       return (data as unknown as DeliveryRequest[]) || [];
     },
   });
 };
 
 export const useCreateDeliveryRequest = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
      mutationFn: async (request: CreateDeliveryRequestInput) => {
        const { data, error } = await supabase
          .from('delivery_requests')
          .insert({
            ...request,
            status: request.status || 'solicitada',
          })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
       toast.success('Solicitação enviada com sucesso!');
     },
     onError: (error: Error) => {
       toast.error(`Erro ao enviar solicitação: ${error.message}`);
     },
   });
 };
 
 export const useUploadAttachment = () => {
   return useMutation({
     mutationFn: async (file: File) => {
       const fileExt = file.name.split('.').pop();
       const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
       const filePath = `attachments/${fileName}`;
 
       const { error } = await supabase.storage
         .from('request-attachments')
         .upload(filePath, file);
 
       if (error) throw error;
 
       return filePath;
     },
     onError: (error: Error) => {
       toast.error(`Erro ao fazer upload: ${error.message}`);
     },
   });
 };
 
export const useTransportTypes = () => {
    return useQuery({
      queryKey: ['transport_types'],
      queryFn: async (): Promise<string[]> => {
        return ['Moto', 'Fiorino', 'Caminhão', 'Caminhão (3/4)'];
      },
    });
  };