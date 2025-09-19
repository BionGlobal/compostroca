import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EntregaFotoLote {
  id: string;
  foto_url: string;
  tipo_foto: string;
  created_at: string;
  entrega_id: string;
  entrega_peso: number;
  entrega_data: string;
  voluntario_nome?: string;
}

export const useEntregasFotosLote = (loteCodigo: string) => {
  const [fotos, setFotos] = useState<EntregaFotoLote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFotosEntregas = async () => {
    if (!loteCodigo) return;
    
    setLoading(true);
    try {
      // Buscar entregas do lote
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          id,
          peso,
          created_at,
          voluntario_id,
          voluntarios (
            nome
          )
        `)
        .eq('lote_codigo', loteCodigo)
        .is('deleted_at', null);

      if (entregasError) throw entregasError;

      if (!entregas || entregas.length === 0) {
        setFotos([]);
        return;
      }

      // Buscar fotos das entregas
      const entregaIds = entregas.map(e => e.id);
      const { data: fotosData, error: fotosError } = await supabase
        .from('entrega_fotos')
        .select('*')
        .in('entrega_id', entregaIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fotosError) throw fotosError;

      // Combinar dados
      const fotosComDados: EntregaFotoLote[] = (fotosData || []).map(foto => {
        const entrega = entregas.find(e => e.id === foto.entrega_id);
        return {
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          created_at: foto.created_at,
          entrega_id: foto.entrega_id,
          entrega_peso: entrega?.peso || 0,
          entrega_data: entrega?.created_at || '',
          voluntario_nome: entrega?.voluntarios?.nome
        };
      });

      setFotos(fotosComDados);
    } catch (error) {
      console.error('Erro ao buscar fotos das entregas:', error);
      setFotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFotosEntregas();
  }, [loteCodigo]);

  const getFotoUrl = (fotoUrl: string): string => {
    if (!fotoUrl) return '';
    
    if (fotoUrl.startsWith('http')) {
      return fotoUrl;
    }
    
    const { data } = supabase.storage.from('entrega-fotos').getPublicUrl(fotoUrl);
    return data.publicUrl;
  };

  return {
    fotos,
    loading,
    refetch: fetchFotosEntregas,
    getFotoUrl
  };
};