import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface LoteFoto {
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
  } | null;
}

export const useLoteFotos = (loteId?: string) => {
  const [fotos, setFotos] = useState<LoteFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchFotos = async () => {
    if (!loteId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Buscando fotos para lote:', loteId);

      // Buscar dados do lote
      const { data: loteData } = await supabase
        .from('lotes')
        .select('data_inicio, codigo')
        .eq('id', loteId)
        .single();

      if (!loteData) {
        setFotos([]);
        return;
      }

      const dataInicio = new Date(loteData.data_inicio).toISOString().split('T')[0];

      // Buscar fotos das entregas do dia de início do lote
      const { data: entregasPorData } = await supabase
        .from('entregas')
        .select(`
          id,
          peso,
          qualidade_residuo,
          created_at,
          lote_codigo,
          voluntarios:voluntario_id(
            id,
            nome,
            numero_balde
          )
        `)
        .gte('created_at', `${dataInicio}T00:00:00.000Z`)
        .lt('created_at', `${dataInicio}T23:59:59.999Z`);
      
      console.log('📅 Data do lote:', dataInicio, 'Entregas encontradas:', entregasPorData?.length || 0);

      // Buscar todas as fotos das entregas encontradas
      let fotosEntregas: LoteFoto[] = [];
      if (entregasPorData && entregasPorData.length > 0) {
        const entregaIds = entregasPorData.map(e => e.id);
        
        const { data: fotosEntregasData } = await supabase
          .from('entrega_fotos')
          .select('*')
          .in('entrega_id', entregaIds)
          .is('deleted_at', null);

        console.log('📸 Fotos de entregas encontradas:', fotosEntregasData?.length || 0);

        if (fotosEntregasData) {
          fotosEntregas = fotosEntregasData.map((foto: any) => {
            const entrega = entregasPorData.find(e => e.id === foto.entrega_id);
            return {
              id: foto.id,
              lote_id: loteId,
              foto_url: foto.foto_url,
              tipo_foto: foto.tipo_foto,
              created_at: foto.created_at,
              entrega_id: foto.entrega_id,
              manejo_id: null,
              ordem_foto: null,
              entregas: entrega ? {
                id: entrega.id,
                peso: entrega.peso,
                qualidade_residuo: entrega.qualidade_residuo,
                voluntarios: entrega.voluntarios
              } : null,
              manejo_semanal: null
            };
          });
        }
      }

      // Buscar fotos de manejo semanal do lote
      const { data: fotosManejo } = await supabase
        .from('lote_fotos')
        .select(`
          id,
          foto_url,
          tipo_foto,
          created_at,
          ordem_foto,
          entrega_id,
          manejo_id,
          manejo_semanal:manejo_id(
            id,
            caixa_origem,
            caixa_destino,
            peso_antes,
            peso_depois
          )
        `)
        .eq('lote_id', loteId)
        .not('manejo_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });


      // Processar fotos de manejo e garantir tipo correto
      const fotosManejoProcesadas: LoteFoto[] = (fotosManejo || []).map(foto => ({
        id: foto.id,
        lote_id: loteId,
        foto_url: foto.foto_url,
        tipo_foto: foto.tipo_foto,
        created_at: foto.created_at,
        entrega_id: foto.entrega_id,
        manejo_id: foto.manejo_id,
        ordem_foto: foto.ordem_foto,
        entregas: null,
        manejo_semanal: foto.manejo_semanal
      }));

      // Combinar fotos de entregas e manejo
      const todasFotos = [...fotosEntregas, ...fotosManejoProcesadas];
      
      console.log('✅ Total de fotos encontradas:', todasFotos.length, 'Entregas:', fotosEntregas.length, 'Manejo:', fotosManejoProcesadas.length);

      setFotos(todasFotos);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (
    arquivo: File,
    tipoFoto: LoteFoto['tipo_foto'],
    loteIdParam: string,
    entregaId?: string,
    manejoId?: string,
    ordemFoto?: number
  ): Promise<LoteFoto | null> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return null;
    }

    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const timestamp = new Date().getTime();
      const nomeArquivo = `${loteIdParam}/${tipoFoto}/${timestamp}_${arquivo.name}`;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lote-fotos')
        .upload(nomeArquivo, arquivo);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('lote-fotos')
        .getPublicUrl(uploadData.path);

      // Salvar referência no banco
      const { data: fotoData, error: dbError } = await supabase
        .from('lote_fotos')
        .insert({
          lote_id: loteIdParam,
          entrega_id: entregaId,
          manejo_id: manejoId,
          foto_url: publicUrl,
          tipo_foto: tipoFoto,
          ordem_foto: ordemFoto,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso",
      });

      // Atualizar estado local
      if (loteId === loteIdParam) {
        setFotos(prev => [...prev, fotoData]);
      }

      return fotoData;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar a foto",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFoto = async (fotoId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lote_fotos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fotoId);

      if (error) throw error;

      // Atualizar estado local
      setFotos(prev => prev.filter(foto => foto.id !== fotoId));

      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover a foto",
        variant: "destructive",
      });
      return false;
    }
  };

  const getFotosByTipo = (tipo: LoteFoto['tipo_foto']) => {
    return fotos.filter(foto => foto.tipo_foto === tipo);
  };

  const getFotosByEntrega = (entregaId: string) => {
    return fotos.filter(foto => foto.entrega_id === entregaId);
  };

  const getFotosByManejo = (manejoId: string) => {
    return fotos.filter(foto => foto.manejo_id === manejoId);
  };

  const getFotoUrl = (fotoUrl: string) => {
    // Se já é uma URL completa, retorna como está
    if (fotoUrl.startsWith('http')) return fotoUrl;
    
    // Para fotos de entregas, usar bucket 'entrega-fotos'
    // Para fotos de manejo, usar bucket 'lote-fotos'
    const bucketName = fotoUrl.includes('entrega') || fotoUrl.includes('conteudo') || fotoUrl.includes('pesagem') || fotoUrl.includes('destino') 
      ? 'entrega-fotos' 
      : 'lote-fotos';
    
    // Construir URL do Supabase Storage
    return `https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/${bucketName}/${fotoUrl}`;
  };

  useEffect(() => {
    if (user && loteId) {
      fetchFotos();
    }
  }, [loteId, user]);

  return {
    fotos,
    loading,
    uploading,
    uploadFoto,
    deleteFoto,
    getFotosByTipo,
    getFotosByEntrega,
    getFotosByManejo,
    getFotoUrl,
    refetch: fetchFotos,
  };
};