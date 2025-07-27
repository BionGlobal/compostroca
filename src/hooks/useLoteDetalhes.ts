import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LoteDetalhes {
  id: string;
  codigo: string;
  unidade: string;
  status: string;
  data_inicio: string;
  data_encerramento: string | null;
  peso_inicial: number;
  peso_atual: number;
  latitude: number | null;
  longitude: number | null;
  criado_por: string;
  criado_por_nome: string;
  hash_integridade: string | null;
  voluntarios: Array<{
    id: string;
    nome: string;
    numero_balde: number;
    entregas_count: number;
    peso_total: number;
  }>;
  entregas: Array<{
    id: string;
    peso: number;
    created_at: string;
    voluntario_nome: string;
    fotos: Array<{
      id: string;
      foto_url: string;
      tipo_foto: string;
    }>;
  }>;
  manejo_fotos: Array<{
    id: string;
    foto_url: string;
    created_at: string;
    caixa_origem: number;
    caixa_destino: number;
  }>;
}

export const useLoteDetalhes = (loteId?: string) => {
  const [loteDetalhes, setLoteDetalhes] = useState<LoteDetalhes | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLoteDetalhes = async () => {
    if (!loteId) return;

    try {
      setLoading(true);

      // Buscar dados básicos do lote
      const { data: lote, error: loteError } = await supabase
        .from('lotes')
        .select('*')
        .eq('id', loteId)
        .single();

      if (loteError) throw loteError;

      // Buscar voluntários com suas entregas
      const { data: entregasData, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          id,
          peso,
          created_at,
          voluntario_id,
          voluntarios!inner(id, nome, numero_balde)
        `)
        .eq('lote_codigo', lote.codigo);

      if (entregasError) throw entregasError;

      // Buscar fotos das entregas separadamente
      const entregaIds = entregasData?.map(e => e.id) || [];
      const { data: fotosData, error: fotosError } = await supabase
        .from('entrega_fotos')
        .select('id, foto_url, tipo_foto, entrega_id')
        .in('entrega_id', entregaIds);

      if (fotosError) throw fotosError;

      // Buscar fotos de manejo
      const { data: manejoData, error: manejoError } = await supabase
        .from('manejo_semanal')
        .select('id, foto_url, created_at, caixa_origem, caixa_destino')
        .eq('lote_id', loteId)
        .not('foto_url', 'is', null);

      if (manejoError) throw manejoError;

      // Processar dados dos voluntários
      const voluntariosMap = new Map();
      
      // Associar fotos às entregas
      const fotosMap = new Map();
      fotosData?.forEach(foto => {
        if (!fotosMap.has(foto.entrega_id)) {
          fotosMap.set(foto.entrega_id, []);
        }
        fotosMap.get(foto.entrega_id).push({
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto
        });
      });

      const entregas = entregasData?.map(entrega => ({
        id: entrega.id,
        peso: Number(entrega.peso),
        created_at: entrega.created_at,
        voluntario_nome: entrega.voluntarios.nome,
        fotos: fotosMap.get(entrega.id) || []
      })) || [];

      entregasData?.forEach(entrega => {
        const voluntarioId = entrega.voluntarios.id;
        if (!voluntariosMap.has(voluntarioId)) {
          voluntariosMap.set(voluntarioId, {
            id: voluntarioId,
            nome: entrega.voluntarios.nome,
            numero_balde: entrega.voluntarios.numero_balde,
            entregas_count: 0,
            peso_total: 0
          });
        }
        const voluntario = voluntariosMap.get(voluntarioId);
        voluntario.entregas_count += 1;
        voluntario.peso_total += Number(entrega.peso);
      });

      const voluntarios = Array.from(voluntariosMap.values());

      const detalhes: LoteDetalhes = {
        ...lote,
        peso_inicial: Number(lote.peso_inicial),
        peso_atual: Number(lote.peso_atual),
        voluntarios,
        entregas,
        manejo_fotos: manejoData || []
      };

      setLoteDetalhes(detalhes);
    } catch (error) {
      console.error('Erro ao buscar detalhes do lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do lote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoteDetalhes();
  }, [loteId]);

  return {
    loteDetalhes,
    loading,
    refetch: fetchLoteDetalhes
  };
};