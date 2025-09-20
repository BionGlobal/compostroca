import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EntregaFoto {
  id: string;
  entrega_id: string;
  tipo_foto: 'conteudo' | 'pesagem' | 'destino';
  foto_url: string;
  created_at: string;
  updated_at: string;
}

export const useEntregaFotos = (entregaId?: string) => {
  const [fotos, setFotos] = useState<EntregaFoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchFotos = async () => {
    if (!entregaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('entrega_fotos')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFotos((data || []) as EntregaFoto[]);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as fotos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (
    arquivo: File, 
    tipo: 'conteudo' | 'pesagem' | 'destino', 
    entregaIdParam: string
  ) => {
    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${entregaIdParam}/${tipo}_${Date.now()}.${fileExt}`;

      // Upload do arquivo para o storage
      const { error: uploadError } = await supabase.storage
        .from('entrega-fotos')
        .upload(fileName, arquivo);

      if (uploadError) throw uploadError;

      // Salvar referência no banco de dados
      const { error: dbError } = await supabase
        .from('entrega_fotos')
        .upsert({
          entrega_id: entregaIdParam,
          tipo_foto: tipo,
          foto_url: fileName,
        });

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Foto salva com sucesso!",
      });

      // Atualizar lista de fotos
      if (entregaId === entregaIdParam) {
        await fetchFotos();
      }

      return true;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a foto",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteFoto = async (fotoId: string, fotoUrl: string) => {
    try {
      // Deletar arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('entrega-fotos')
        .remove([fotoUrl]);

      if (storageError) throw storageError;

      // Deletar registro do banco
      const { error: dbError } = await supabase
        .from('entrega_fotos')
        .delete()
        .eq('id', fotoId);

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso!",
      });

      // Atualizar lista
      await fetchFotos();
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto",
        variant: "destructive",
      });
    }
  };

  const getFotoUrl = (fotoUrl: string) => {
    const { data } = supabase.storage
      .from('entrega-fotos')
      .getPublicUrl(fotoUrl);
    
    return data.publicUrl;
  };

  const validateAllPhotos = (entregaIdParam: string) => {
    const fotosEntrega = fotos.filter(f => f.entrega_id === entregaIdParam);
    const tiposNecessarios: ('conteudo' | 'pesagem' | 'destino')[] = ['conteudo', 'pesagem', 'destino'];
    
    return tiposNecessarios.every(tipo => 
      fotosEntrega.some(foto => foto.tipo_foto === tipo)
    );
  };

  const getFotosByTipo = (tipo: 'conteudo' | 'pesagem' | 'destino') => {
    return fotos.filter(foto => foto.tipo_foto === tipo);
  };

  useEffect(() => {
    if (entregaId) {
      fetchFotos();
    }
  }, [entregaId]);

  return {
    fotos,
    loading,
    uploading,
    uploadFoto,
    deleteFoto,
    getFotoUrl,
    validateAllPhotos,
    getFotosByTipo,
    refetch: fetchFotos,
  };
};