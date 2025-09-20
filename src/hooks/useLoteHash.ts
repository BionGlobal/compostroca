import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateLoteHash, generateChainedLoteHash, validateLoteHash, type LoteHashData } from '@/lib/hashUtils';

export const useLoteHash = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSaveHash = async (loteId: string, loteData?: Partial<LoteHashData>, useChain: boolean = true) => {
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
          fotos: fotos?.map(f => f.foto_url) || [],
          hash_anterior: lote.hash_anterior,
          indice_cadeia: lote.indice_cadeia
        };
      }
      
      let hash: string;
      let previousHash: string | null = null;
      let chainIndex: number = 0;

      if (useChain) {
        // Buscar o último hash da cadeia para esta unidade
        const { data: lastHashData } = await supabase
          .rpc('get_last_chain_hash', { unit_code: completeData.unidade });
        
        previousHash = lastHashData;

        // Buscar o próximo índice da cadeia
        const { data: nextIndexData } = await supabase
          .rpc('get_next_chain_index');
        
        chainIndex = nextIndexData || 0;

        // Atualizar os dados com as informações da cadeia
        completeData.hash_anterior = previousHash;
        completeData.indice_cadeia = chainIndex;

        hash = generateChainedLoteHash(completeData as LoteHashData, previousHash);

        // Salvar com informações da cadeia
        const { error } = await supabase
          .from('lotes')
          .update({ 
            hash_integridade: hash,
            hash_anterior: previousHash,
            indice_cadeia: chainIndex
          })
          .eq('id', loteId);

        if (error) throw error;
      } else {
        hash = generateLoteHash(completeData as LoteHashData);
        
        const { error } = await supabase
          .from('lotes')
          .update({ hash_integridade: hash })
          .eq('id', loteId);

        if (error) throw error;
      }

      toast({
        title: "Hash gerado",
        description: useChain ? 
          `Hash da cadeia criado (índice ${chainIndex})` : 
          "Hash de integridade criado com sucesso",
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