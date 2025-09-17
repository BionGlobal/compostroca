import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateLoteHash, validateLoteHash, type LoteHashData } from '@/lib/hashUtils';

export const useLoteHash = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSaveHash = async (loteId: string, loteData?: Partial<LoteHashData>) => {
    try {
      setLoading(true);
      
      // Se não recebeu loteData, buscar todos os dados necessários
      let completeData = loteData;
      if (!completeData || !completeData.codigo) {
        const { data: lote, error: loteError } = await supabase
          .from('lotes')
          .select('*')
          .eq('id', loteId)
          .single();

        if (loteError) throw loteError;

        // Buscar entregas do lote
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select('id, peso, created_at')
          .eq('lote_codigo', lote.codigo);

        if (entregasError) throw entregasError;

        // Buscar voluntários únicos
        const { data: voluntarios, error: voluntariosError } = await supabase
          .from('entregas')
          .select('voluntario_id')
          .eq('lote_codigo', lote.codigo);

        if (voluntariosError) throw voluntariosError;

        // Buscar fotos do lote
        const { data: fotos, error: fotosError } = await supabase
          .from('lote_fotos')
          .select('foto_url')
          .eq('lote_id', loteId);

        if (fotosError) throw fotosError;

        completeData = {
          codigo: lote.codigo,
          unidade: lote.unidade,
          data_inicio: lote.data_inicio,
          data_encerramento: lote.data_encerramento,
          peso_inicial: lote.peso_inicial || 0,
          peso_atual: lote.peso_atual || 0,
          latitude: lote.latitude,
          longitude: lote.longitude,
          criado_por: lote.criado_por,
          voluntarios: [...new Set(voluntarios?.map(v => v.voluntario_id) || [])],
          entregas: entregas?.map(e => e.id) || [],
          fotos: fotos?.map(f => f.foto_url) || []
        };
      }
      
      const hash = generateLoteHash(completeData as LoteHashData);
      
      const { error } = await supabase
        .from('lotes')
        .update({ hash_integridade: hash })
        .eq('id', loteId);

      if (error) throw error;

      toast({
        title: "Hash gerado",
        description: "Hash de integridade criado com sucesso",
      });

      return hash;
    } catch (error) {
      console.error('Erro ao gerar hash:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o hash de integridade",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateHash = (loteData: LoteHashData, storedHash: string): boolean => {
    return validateLoteHash(loteData, storedHash);
  };

  const copyHashToClipboard = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast({
        title: "Hash copiado",
        description: "Hash de integridade copiado para a área de transferência",
      });
    } catch (error) {
      console.error('Erro ao copiar hash:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o hash",
        variant: "destructive",
      });
    }
  };

  return {
    generateAndSaveHash,
    validateHash,
    copyHashToClipboard,
    loading
  };
};