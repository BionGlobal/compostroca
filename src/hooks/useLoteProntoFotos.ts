import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LoteProntoFoto {
  id: string;
  foto_url: string;
  tipo_foto: 'entrega' | 'manejo_semanal' | 'entrega_conteudo' | 'entrega_pesagem' | 'entrega_destino';
  created_at: string;
  // Dados enriched da entrega
  entrega_data?: {
    id: string;
    peso: number;
    created_at: string;
    qualidade_residuo?: number;
    observacoes?: string;
    voluntario: {
      id: string;
      nome: string;
      numero_balde: number;
      unidade: string;
    };
  };
  // Dados enriched do manejo
  manejo_data?: {
    id: string;
    peso_antes: number;
    peso_depois: number;
    caixa_origem: number;
    caixa_destino?: number;
    observacoes?: string;
    created_at: string;
    latitude?: number;
    longitude?: number;
  };
}

export const useLoteProntoFotos = (loteId?: string) => {
  const [fotos, setFotos] = useState<LoteProntoFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchFotosLoteProto = async () => {
    if (!loteId || !user) return;
    
    setLoading(true);
    try {
      // Verificar se o lote existe e está encerrado
      const { data: lote, error: loteError } = await supabase
        .from('lotes')
        .select('*')
        .eq('id', loteId)
        .eq('status', 'encerrado')
        .single();

      if (loteError) {
        console.error('Erro ao buscar lote:', loteError);
        return;
      }

      if (!lote) {
        console.log('Lote não encontrado ou não está encerrado');
        return;
      }

      // Buscar TODAS as fotos do lote através da tabela lote_fotos
      const { data: lotefotos, error: lotePhotosError } = await supabase
        .from('lote_fotos')
        .select(`
          id,
          foto_url,
          tipo_foto,
          created_at,
          ordem_foto,
          entrega_id,
          manejo_id
        `)
        .eq('lote_id', loteId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (lotePhotosError) {
        console.error('Erro ao buscar fotos do lote:', lotePhotosError);
        setFotos([]);
        return;
      }

      // Buscar dados complementares para entregas
      const entregaIds = lotefotos?.filter(f => f.entrega_id).map(f => f.entrega_id) || [];
      let entregasData: any = {};
      
      if (entregaIds.length > 0) {
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select(`
            id,
            peso,
            created_at,
            qualidade_residuo,
            observacoes,
            voluntarios!inner(
              id,
              nome,
              numero_balde,
              unidade
            )
          `)
          .in('id', entregaIds)
          .is('deleted_at', null);

        if (!entregasError && entregas) {
          entregas.forEach((entrega: any) => {
            entregasData[entrega.id] = entrega;
          });
        }
      }

      // Buscar dados complementares para manejos
      const manejoIds = lotefotos?.filter(f => f.manejo_id).map(f => f.manejo_id) || [];
      let manejosData: any = {};
      
      if (manejoIds.length > 0) {
        const { data: manejos, error: manejosError } = await supabase
          .from('manejo_semanal')
          .select(`
            id,
            peso_antes,
            peso_depois,
            caixa_origem,
            caixa_destino,
            observacoes,
            created_at,
            latitude,
            longitude
          `)
          .in('id', manejoIds);

        if (!manejosError && manejos) {
          manejos.forEach((manejo: any) => {
            manejosData[manejo.id] = manejo;
          });
        }
      }

      // Processar todas as fotos
      const fotosProcessadas: LoteProntoFoto[] = [];
      
      if (lotefotos) {
        lotefotos.forEach((foto: any) => {
          const fotoBase = {
            id: foto.id,
            foto_url: foto.foto_url,
            tipo_foto: foto.tipo_foto as LoteProntoFoto['tipo_foto'],
            created_at: foto.created_at
          };

          if (foto.entrega_id && entregasData[foto.entrega_id]) {
            const entrega = entregasData[foto.entrega_id];
            fotosProcessadas.push({
              ...fotoBase,
              tipo_foto: 'entrega' as const,
              entrega_data: {
                id: entrega.id,
                peso: entrega.peso,
                created_at: entrega.created_at,
                qualidade_residuo: entrega.qualidade_residuo || 0,
                observacoes: entrega.observacoes,
                voluntario: {
                  id: entrega.voluntarios.id,
                  nome: entrega.voluntarios.nome,
                  numero_balde: entrega.voluntarios.numero_balde,
                  unidade: entrega.voluntarios.unidade
                }
              }
            });
          } else if (foto.manejo_id && manejosData[foto.manejo_id]) {
            const manejo = manejosData[foto.manejo_id];
            fotosProcessadas.push({
              ...fotoBase,
              tipo_foto: 'manejo_semanal' as const,
              manejo_data: {
                id: manejo.id,
                peso_antes: manejo.peso_antes,
                peso_depois: manejo.peso_depois,
                caixa_origem: manejo.caixa_origem,
                caixa_destino: manejo.caixa_destino,
                observacoes: manejo.observacoes,
                created_at: manejo.created_at,
                latitude: manejo.latitude,
                longitude: manejo.longitude
              }
            });
          } else {
            // Foto sem dados complementares
            fotosProcessadas.push(fotoBase);
          }
        });
      }

      setFotos(fotosProcessadas);
    } catch (error) {
      console.error('Erro ao buscar fotos do lote pronto:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFotosLoteProto();
  }, [loteId, user]);

  // Função para construir URL pública da foto
  const getFotoUrl = (fotoUrl: string): string => {
    // Se já é URL completa, retornar como está
    if (fotoUrl.startsWith('http')) return fotoUrl;
    
    // Determinar o bucket correto baseado no tipo de foto
    const bucketName = fotoUrl.includes('manejo') || fotoUrl.includes('Manejo')
      ? 'manejo-fotos'
      : 'entrega-fotos';
    
    // Construir URL completa do Supabase Storage
    return `https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/${bucketName}/${fotoUrl}`;
  };

  // Filtros específicos
  const getFotosByTipo = (tipo: LoteProntoFoto['tipo_foto']) => {
    return fotos.filter(foto => foto.tipo_foto === tipo);
  };

  const getFotosEntregas = () => {
    return fotos.filter(foto => foto.tipo_foto === 'entrega' || foto.entrega_data);
  };

  const getFotosManejo = () => {
    return fotos.filter(foto => foto.tipo_foto === 'manejo_semanal' || foto.manejo_data);
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