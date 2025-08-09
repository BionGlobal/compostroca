import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lote } from '@/types'; // Assumindo que o tipo Lote está definido em types.ts

export const useLotes = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // --- CONSULTA CORRIGIDA ---
      // A consulta agora é mais explícita e robusta, selecionando os nomes das
      // tabelas relacionadas e ordenando pela data de início.
      const { data, error } = await supabase
        .from('lotes')
        .select(`
          id,
          start_date,
          status,
          pilhas_de_composto ( name ),
          coletivos ( name )
        `)
        .order('start_date', { ascending: false });

      if (error) {
        throw error;
      }
      
      setLotes(data || []);

    } catch (err: any) {
      setError(err);
      console.error('Error fetching lotes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  return { lotes, loading, error, refetch: fetchLotes };
};
