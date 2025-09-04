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

      // Buscar dados do lote
      console.log('🔍 Buscando lote com ID:', loteId);
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select('data_inicio, codigo, unidade')
        .eq('id', loteId)
        .maybeSingle();

      console.log('📦 Dados do lote:', loteData);

      if (!loteData) {
        console.warn('❌ Lote não encontrado para ID:', loteId);
        setFotos([]);
        return;
      }

      const dataInicio = new Date(loteData.data_inicio).toISOString().split('T')[0];
      console.log('📅 Data de início formatada:', dataInicio);

      // Buscar entregas da data usando query simplificada sem 'unidade'
      console.log('🔍 Buscando entregas para data:', dataInicio);
      
      const entregasQuery = await supabase
        .from('entregas')
        .select('id, peso, qualidade_residuo, created_at, voluntario_id')
        .gte('created_at', `${dataInicio}T00:00:00.000Z`)
        .lt('created_at', `${dataInicio}T23:59:59.999Z`);
      
      const entregas = entregasQuery.data || [];
      console.log('📦 Entregas encontradas:', entregas.length);

      // Buscar dados dos voluntários separadamente
      let voluntariosData: any[] = [];
      let entregasFiltradas: any[] = [];
      
      if (entregas.length > 0) {
        // Filtrar entregas por voluntários da mesma unidade do lote
        const { data: voluntariosUnidade } = await supabase
          .from('voluntarios')
          .select('id')
          .eq('unidade', loteData.unidade);
        
        const voluntariosUnidadeIds = (voluntariosUnidade || []).map(v => v.id);
        entregasFiltradas = entregas.filter(e => 
          e.voluntario_id && voluntariosUnidadeIds.includes(e.voluntario_id)
        );

        const voluntarioIds = entregasFiltradas
          .map(e => e.voluntario_id)
          .filter((id): id is string => typeof id === 'string' && id !== null && id !== '');
        
        const uniqueVoluntarioIds = Array.from(new Set(voluntarioIds));
        
        if (uniqueVoluntarioIds.length > 0) {
          const { data: voluntarios } = await supabase
            .from('voluntarios')
            .select('id, nome, numero_balde')
            .in('id', uniqueVoluntarioIds);
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
        console.log('📸 Fotos de entregas encontradas:', fotosEntregasData.length);
      }

      // Buscar fotos de manejo semanal do lote específico
      console.log('🔍 Buscando fotos de manejo para loteId:', loteId);
      const { data: fotosManejo } = await supabase
        .from('lote_fotos')
        .select('id, foto_url, tipo_foto, created_at, ordem_foto, entrega_id, manejo_id')
        .eq('lote_id', loteId)
        .not('manejo_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      console.log('🧑‍🌾 Fotos de manejo encontradas:', fotosManejo?.length || 0);

      // Processar fotos das entregas
      const fotosEntregasProcessadas: LoteFoto[] = fotosEntregasData.map(foto => {
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

      // Processar fotos de manejo
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
        manejo_semanal: null
      }));

      // Combinar fotos
      const todasFotos = [...fotosEntregasProcessadas, ...fotosManejoProcesadas];
      console.log('📊 Total de fotos combinadas:', todasFotos.length);
      console.log('📊 Entregas:', fotosEntregasProcessadas.length, 'Manejo:', fotosManejoProcesadas.length);

      setFotos(todasFotos);
    } catch (error) {
      console.error('❌ Erro ao buscar fotos:', error);
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