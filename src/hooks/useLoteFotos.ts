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
  updated_at: string;
  deleted_at?: string | null;
  // Dados enriched
  entregas?: {
    id: string;
    voluntario_id: string;
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
      
      // Buscar fotos do lote
      const { data: loteData } = await supabase
        .from('lotes')
        .select('codigo, data_inicio')
        .eq('id', loteId)
        .single();

      if (!loteData) {
        setLoading(false);
        return;
      }

      // Buscar fotos de entregas (por código do lote ou por data)
      const { data: fotosEntregas } = await supabase
        .from('lote_fotos')
        .select(`
          *,
          entregas(
            id,
            lote_codigo,
            created_at,
            voluntarios(nome, numero_balde)
          )
        `)
        .eq('lote_id', loteId)
        .not('entrega_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Buscar fotos de manejo semanal
      const { data: fotosManejo } = await supabase
        .from('lote_fotos')
        .select(`
          *,
          manejo_semanal(
            id,
            caixa_origem,
            caixa_destino,
            created_at
          )
        `)
        .eq('lote_id', loteId)
        .not('manejo_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Se não há fotos de entregas por lote_id, buscar por data de criação
      let fotosEntregasAdicional: any[] = [];
      if (!fotosEntregas || fotosEntregas.length === 0) {
        const dataInicio = new Date(loteData.data_inicio).toISOString().split('T')[0];
        
        const { data: entregasPorData } = await supabase
          .from('entregas')
          .select(`
            id,
            entrega_fotos(
              id,
              foto_url,
              tipo_foto,
              created_at
            ),
            voluntarios(nome, numero_balde)
          `)
          .gte('created_at', `${dataInicio}T00:00:00.000Z`)
          .lt('created_at', `${dataInicio}T23:59:59.999Z`);
        
        if (entregasPorData && Array.isArray(entregasPorData)) {
          fotosEntregasAdicional = entregasPorData.flatMap(entrega => {
            if (!entrega.entrega_fotos || !Array.isArray(entrega.entrega_fotos)) {
              return [];
            }
            return entrega.entrega_fotos.map(foto => ({
              ...foto,
              lote_id: loteId,
              entrega_id: entrega.id,
              tipo_foto: foto.tipo_foto || 'entrega',
              entregas: {
                id: entrega.id,
                voluntarios: entrega.voluntarios
              }
            }));
          });
        }
      }

      const todasFotos = [
        ...(fotosEntregas || []),
        ...fotosEntregasAdicional,
        ...(fotosManejo || [])
      ];

      setFotos(todasFotos);
    } catch (error) {
      console.error('Erro ao buscar fotos do lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as fotos do lote",
        variant: "destructive",
      });
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
    
    // Caso contrário, constroi a URL do Supabase Storage
    const { data } = supabase.storage
      .from('lote-fotos')
      .getPublicUrl(fotoUrl);
    
    return data.publicUrl;
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