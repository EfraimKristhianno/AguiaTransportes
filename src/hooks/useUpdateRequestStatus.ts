import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { brazilNowISO } from '@/lib/utils';

interface UpdateStatusInput {
  requestId: string;
  status: string;
  attachmentPaths?: string[];
  notes?: string;
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, attachmentPaths = [], notes }: UpdateStatusInput) => {
      // 1. Update the delivery request status (trigger will create history entry)
      const now = brazilNowISO();
      const updateData: Record<string, unknown> = {
        status,
        updated_at: now,
      };
      if (status === 'entregue') {
        updateData.delivered_at = now;
      }

      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. Update the latest history entry with attachments and/or notes
      if (attachmentPaths.length > 0 || notes) {
        const { data: historyEntries, error: historyError } = await supabase
          .from('delivery_request_status_history')
          .select('id')
          .eq('delivery_request_id', requestId)
          .eq('status', status)
          .order('changed_at', { ascending: false })
          .limit(1);

        if (historyError) throw historyError;

        if (historyEntries && historyEntries.length > 0) {
          const historyUpdate: Record<string, unknown> = {};
          if (attachmentPaths.length > 0) historyUpdate.attachments = attachmentPaths;
          if (notes) historyUpdate.notes = notes;

          const { error: attachError } = await supabase
            .from('delivery_request_status_history')
            .update(historyUpdate)
            .eq('id', historyEntries[0].id);

          if (attachError) throw attachError;
        }
      }

      return { requestId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequestDetail'] });
      queryClient.invalidateQueries({ queryKey: ['request_history'] });
      
      const statusLabels: Record<string, string> = {
        pendente_coleta: 'Coleta Pendente',
        coletada: 'Coletada',
        em_rota: 'Em Trânsito',
        pendente_entrega: 'Entrega Pendente',
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
    mutationFn: async ({ file, requestId }: { file: File; requestId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${requestId}/status-attachments/${fileName}`;

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
