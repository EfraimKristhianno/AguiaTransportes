import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MaterialType } from '@/types/database';
import { toast } from 'sonner';

export const useMaterialTypes = () => {
  return useQuery({
    queryKey: ['material_types'],
    queryFn: async (): Promise<MaterialType[]> => {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useMaterialType = (materialTypeId: string) => {
  return useQuery({
    queryKey: ['material_types', materialTypeId],
    queryFn: async (): Promise<MaterialType | null> => {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .eq('id', materialTypeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!materialTypeId,
  });
};

export const useCreateMaterialType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialType: Omit<MaterialType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('material_types')
        .insert(materialType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material_types'] });
      toast.success('Tipo de material criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tipo de material: ${error.message}`);
    },
  });
};

export const useDeleteMaterialType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialTypeId: string) => {
      const { error } = await supabase
        .from('material_types')
        .delete()
        .eq('id', materialTypeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material_types'] });
      toast.success('Tipo de material excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tipo de material: ${error.message}`);
    },
  });
};
