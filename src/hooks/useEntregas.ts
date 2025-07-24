import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Entrega {
  id: string;
  voluntario_id: string;
  peso: number;
  fotos: string[];
  latitude?: number;
  longitude?: number;
  geolocalizacao_validada: boolean;
  lote_codigo?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export const useEntregas = (voluntarioId?: string) => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('entregas')
        .select('*')
        .order('created_at', { ascending: false });

      if (voluntarioId) {
        query = query.eq('voluntario_id', voluntarioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntregas(data || []);
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as entregas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalKgByVoluntario = (voluntarioId: string) => {
    return entregas
      .filter(e => e.voluntario_id === voluntarioId)
      .reduce((total, entrega) => total + Number(entrega.peso), 0);
  };

  const getCountByVoluntario = (voluntarioId: string) => {
    return entregas.filter(e => e.voluntario_id === voluntarioId).length;
  };

  useEffect(() => {
    fetchEntregas();
  }, [voluntarioId]);

  return {
    entregas,
    loading,
    getTotalKgByVoluntario,
    getCountByVoluntario,
    refetch: fetchEntregas,
  };
};