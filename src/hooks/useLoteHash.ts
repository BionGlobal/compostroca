import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateLoteHash, validateLoteHash, type LoteHashData } from '@/lib/hashUtils';

export const useLoteHash = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAndSaveHash = async (loteId: string, loteData: LoteHashData) => {
    try {
      setLoading(true);
      
      const hash = generateLoteHash(loteData);
      
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