import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateStatusInput {
  requestId: string;
  status: string;
  attachmentPaths?: string[];
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, attachmentPaths = [] }: UpdateStatusInput) => {
      // 1. Update the delivery request status (trigger will create history entry)
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === 'entregue') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. If there are attachments, update the latest history entry for this status
      if (attachmentPaths.length > 0) {
        // Find the history entry just created by the trigger
        const { data: historyEntries, error: historyError } = await supabase
          .from('delivery_request_status_history')
          .select('id')
          .eq('delivery_request_id', requestId)
          .eq('status', status)
          .order('changed_at', { ascending: false })
          .limit(1);

        if (historyError) throw historyError;

        if (historyEntries && historyEntries.length > 0) {
          const { error: attachError } = await supabase
            .from('delivery_request_status_history')
            .update({ attachments: attachmentPaths })
            .eq('id', historyEntries[0].id);

          if (attachError) throw attachError;
        }
      }

      return { requestId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
      queryClient.invalidateQueries({ queryKey: ['request_history'] });
      
      const statusLabels: Record<string, string> = {
        coletada: 'Coletada',
        em_rota: 'Em Trânsito',
        entregue: 'Entregue',
      };
      toast.success(`Status atualizado para: ${statusLabels[variables.status] || variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
};

export const useUploadStatusAttachment = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `status-attachments/${fileName}`;

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
