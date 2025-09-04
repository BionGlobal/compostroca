import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LoteProntoFoto {
  id: string;
  lote_id: string;
  entrega_id?: string | null;
  manejo_id?: string | null;
  foto_url: string;
  tipo_foto: string;
  ordem_foto?: number | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Dados enriched
  entregas?: {
    id: string;
    peso?: number;
    qualidade_residuo?: number;
    voluntarios: {
      id: string;
      nome: string;
      numero_balde: number;
    };
  } | null;
  manejo_semanal?: {
    id: string;
    caixa_origem: number;
    caixa_destino: number;
    peso_antes?: number;
    peso_depois?: number;
    observacoes?: string;
  } | null;
}

export const useLoteProntoFotos = (loteId?: string) => {
  const [fotos, setFotos] = useState<LoteProntoFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchFotosLoteProto = async () => {
    if (!loteId || !user) return;
    
    setLoading(true);
    try {
      // Buscar dados do lote
      const { data: loteData } = await supabase
        .from('lotes')
        .select('data_inicio, codigo, unidade, status')
        .eq('id', loteId)
        .single();

      if (!loteData) {
        setFotos([]);
        return;
      }

      // Só proceder se for um lote encerrado
      if (loteData.status !== 'encerrado') {
        setFotos([]);
        return;
      }

      const dataInicio = new Date(loteData.data_inicio).toISOString().split('T')[0];

      // 1. Buscar fotos das entregas da data de início
      const entregasQuery = await supabase
        .from('entregas')
        .select('id, peso, qualidade_residuo, created_at, voluntario_id')
        .gte('created_at', `${dataInicio}T00:00:00.000Z`)
        .lt('created_at', `${dataInicio}T23:59:59.999Z`);
      
      const entregas = entregasQuery.data || [];

      // Filtrar entregas por voluntários da mesma unidade do lote
      let entregasFiltradas: any[] = [];
      let voluntariosData: any[] = [];
      
      if (entregas.length > 0) {
        const { data: voluntariosUnidade } = await supabase
          .from('voluntarios')
          .select('id')
          .eq('unidade', loteData.unidade);
        
        const voluntariosUnidadeIds = (voluntariosUnidade || []).map(v => v.id);
        entregasFiltradas = entregas.filter(e => 
          e.voluntario_id && voluntariosUnidadeIds.includes(e.voluntario_id)
        );

        // Buscar dados dos voluntários
        const voluntarioIds = Array.from(new Set(
          entregasFiltradas
            .map(e => e.voluntario_id)
            .filter((id): id is string => typeof id === 'string' && id !== null && id !== '')
        ));
        
        if (voluntarioIds.length > 0) {
          const { data: voluntarios } = await supabase
            .from('voluntarios')
            .select('id, nome, numero_balde')
            .in('id', voluntarioIds);
          voluntariosData = voluntarios || [];
        }
      }

      // Buscar fotos das entregas encontradas
      let fotosEntregasData: any[] = [];
      if (entregasFiltradas.length > 0) {
        const entregaIds = entregasFiltradas.map(e => e.id);
        const { data: fotosData } = await supabase
          .from('entrega_fotos')
          .select('id, entrega_id, foto_url, tipo_foto, created_at')
          .in('entrega_id', entregaIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });
        
        fotosEntregasData = fotosData || [];
      }

      // 2. Buscar fotos da última manutenção semanal (caixa 7)
      const { data: ultimoManejo } = await supabase
        .from('manejo_semanal')
        .select('id, created_at, caixa_origem, caixa_destino, peso_antes, peso_depois, observacoes')
        .eq('lote_id', loteId)
        .eq('caixa_origem', 7)
        .order('created_at', { ascending: false })
        .limit(1);

      let fotosUltimoManejo: any[] = [];
      if (ultimoManejo && ultimoManejo.length > 0) {
        const manejoId = ultimoManejo[0].id;
        const { data: fotosManejo } = await supabase
          .from('lote_fotos')
          .select('id, foto_url, tipo_foto, created_at, ordem_foto, manejo_id')
          .eq('lote_id', loteId)
          .eq('manejo_id', manejoId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });
        
        fotosUltimoManejo = fotosManejo || [];
      }

      // Processar fotos das entregas
      const fotosEntregasProcessadas: LoteProntoFoto[] = fotosEntregasData.map(foto => {
        const entregaRelacionada = entregasFiltradas.find(e => e.id === foto.entrega_id);
        const voluntarioRelacionado = entregaRelacionada ? 
          voluntariosData.find(v => v.id === entregaRelacionada.voluntario_id) : null;
        
        return {
          id: foto.id,
          lote_id: loteId,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          created_at: foto.created_at,
          entrega_id: foto.entrega_id,
          manejo_id: null,
          ordem_foto: null,
          entregas: entregaRelacionada ? {
            id: entregaRelacionada.id,
            peso: entregaRelacionada.peso,
            qualidade_residuo: entregaRelacionada.qualidade_residuo,
            voluntarios: voluntarioRelacionado || {
              id: '',
              nome: 'Voluntário não encontrado',
              numero_balde: 0
            }
          } : null,
          manejo_semanal: null
        };
      });

      // Processar fotos da última manutenção
      const fotosManejoProcessadas: LoteProntoFoto[] = fotosUltimoManejo.map(foto => ({
        id: foto.id,
        lote_id: loteId,
        foto_url: foto.foto_url,
        tipo_foto: foto.tipo_foto,
        created_at: foto.created_at,
        entrega_id: null,
        manejo_id: foto.manejo_id,
        ordem_foto: foto.ordem_foto,
        entregas: null,
        manejo_semanal: ultimoManejo ? {
          id: ultimoManejo[0].id,
          peso_antes: ultimoManejo[0].peso_antes,
          peso_depois: ultimoManejo[0].peso_depois,
          caixa_origem: ultimoManejo[0].caixa_origem,
          caixa_destino: ultimoManejo[0].caixa_destino || 8, // Usa valor real ou padrão para finalização
          observacoes: ultimoManejo[0].observacoes
        } : null
      }));

      // Combinar todas as fotos
      const todasFotos = [...fotosEntregasProcessadas, ...fotosManejoProcessadas];
      
      setFotos(todasFotos);
      console.log('✅ Fotos do lote pronto carregadas:', todasFotos.length);
      
    } catch (error) {
      console.error('❌ Erro ao buscar fotos do lote pronto:', error);
      setFotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFotosLoteProto();
  }, [loteId, user]);

  // Função para construir URL pública da foto
  const getFotoUrl = (fotoUrl: string): string => {
    if (fotoUrl.includes('entrega-fotos/')) {
      return supabase.storage.from('entrega-fotos').getPublicUrl(fotoUrl.split('entrega-fotos/')[1]).data.publicUrl;
    } else if (fotoUrl.includes('lote-fotos/')) {
      return supabase.storage.from('lote-fotos').getPublicUrl(fotoUrl.split('lote-fotos/')[1]).data.publicUrl;
    }
    return fotoUrl;
  };

  // Filtros específicos
  const getFotosByTipo = (tipo: LoteProntoFoto['tipo_foto']) => {
    return fotos.filter(foto => foto.tipo_foto === tipo);
  };

  const getFotosEntregas = () => {
    return fotos.filter(foto => foto.entrega_id !== null);
  };

  const getFotosManejo = () => {
    return fotos.filter(foto => foto.manejo_id !== null);
  };

  return {
    fotos,
    loading,
    refetch: fetchFotosLoteProto,
    getFotoUrl,
    getFotosByTipo,
    getFotosEntregas,
    getFotosManejo
  };
};