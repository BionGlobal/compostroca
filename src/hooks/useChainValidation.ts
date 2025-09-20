import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateChainedLoteHash, type LoteHashData, type ChainValidationResult } from '@/lib/hashUtils';

export const useChainValidation = () => {
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ChainValidationResult | null>(null);
  const { toast } = useToast();

  const validateChainIntegrity = async (unidade?: string): Promise<ChainValidationResult> => {
    try {
      setLoading(true);
      
      // Buscar todos os lotes ordenados por índice da cadeia
      let query = supabase
        .from('lotes')
        .select(`
          id, codigo, unidade, data_inicio, data_encerramento,
          peso_inicial, peso_atual, latitude, longitude, criado_por,
          hash_integridade, hash_anterior, indice_cadeia,
          created_at
        `)
        .is('deleted_at', null)
        .not('hash_integridade', 'is', null)
        .order('indice_cadeia', { ascending: true });

      if (unidade) {
        query = query.eq('unidade', unidade);
      }

      const { data: lotes, error } = await query;

      if (error) throw error;

      if (!lotes || lotes.length === 0) {
        const result: ChainValidationResult = {
          isValid: true,
          totalLotes: 0,
          validatedChainLength: 0
        };
        setValidationResult(result);
        return result;
      }

      let isValid = true;
      let brokenAtIndex: number | undefined;
      let brokenLoteId: string | undefined;
      let validatedChainLength = 0;

      for (let i = 0; i < lotes.length; i++) {
        const lote = lotes[i];
        const previousHash = i === 0 ? null : lotes[i - 1].hash_integridade;

        // Buscar entregas do lote
        const { data: entregas } = await supabase
          .from('entregas')
          .select('id, peso, created_at')
          .eq('lote_codigo', lote.codigo);

        // Buscar voluntários únicos
        const { data: voluntarios } = await supabase
          .from('entregas')
          .select('voluntario_id')
          .eq('lote_codigo', lote.codigo);

        // Buscar fotos do lote
        const { data: fotos } = await supabase
          .from('lote_fotos')
          .select('foto_url')
          .eq('lote_id', lote.id);

        const loteData: LoteHashData = {
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

        const expectedHash = generateChainedLoteHash(loteData, previousHash);
        
        if (expectedHash !== lote.hash_integridade) {
          isValid = false;
          brokenAtIndex = lote.indice_cadeia;
          brokenLoteId = lote.id;
          break;
        }

        // Verificar se o hash_anterior está correto
        if (i > 0 && lote.hash_anterior !== previousHash) {
          isValid = false;
          brokenAtIndex = lote.indice_cadeia;
          brokenLoteId = lote.id;
          break;
        }

        validatedChainLength++;
      }

      const result: ChainValidationResult = {
        isValid,
        brokenAtIndex,
        brokenLoteId,
        totalLotes: lotes.length,
        validatedChainLength
      };

      setValidationResult(result);

      if (!isValid) {
        toast({
          title: "⚠️ Quebra na Cadeia de Integridade",
          description: `Quebra detectada no lote índice ${brokenAtIndex}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Cadeia de Integridade Válida",
          description: `${validatedChainLength} lotes validados com sucesso`,
        });
      }

      return result;
    } catch (error) {
      console.error('Erro na validação da cadeia:', error);
      toast({
        title: "Erro na Validação",
        description: "Não foi possível validar a cadeia de integridade",
        variant: "destructive",
      });
      
      const errorResult: ChainValidationResult = {
        isValid: false,
        totalLotes: 0,
        validatedChainLength: 0
      };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  const repairChainFromIndex = async (startIndex: number, unidade: string) => {
    try {
      setLoading(true);
      
      // Buscar lotes a partir do índice quebrado
      const { data: lotesToRepair, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', unidade)
        .gte('indice_cadeia', startIndex)
        .is('deleted_at', null)
        .order('indice_cadeia', { ascending: true });

      if (error) throw error;

      if (!lotesToRepair || lotesToRepair.length === 0) {
        toast({
          title: "Nenhum Lote para Reparar",
          description: "Não foram encontrados lotes para reparo",
        });
        return;
      }

      // Buscar o hash anterior válido
      let previousHash: string | null = null;
      if (startIndex > 0) {
        const { data: previousLote } = await supabase
          .from('lotes')
          .select('hash_integridade')
          .eq('unidade', unidade)
          .eq('indice_cadeia', startIndex - 1)
          .is('deleted_at', null)
          .single();
        
        previousHash = previousLote?.hash_integridade || null;
      }

      // Reparar cada lote na sequência
      for (const lote of lotesToRepair) {
        // Buscar dados completos do lote
        const { data: entregas } = await supabase
          .from('entregas')
          .select('id, voluntario_id')
          .eq('lote_codigo', lote.codigo);

        const { data: fotos } = await supabase
          .from('lote_fotos')
          .select('foto_url')
          .eq('lote_id', lote.id);

        const loteData: LoteHashData = {
          codigo: lote.codigo,
          unidade: lote.unidade,
          data_inicio: lote.data_inicio,
          data_encerramento: lote.data_encerramento,
          peso_inicial: lote.peso_inicial || 0,
          peso_atual: lote.peso_atual || 0,
          latitude: lote.latitude,
          longitude: lote.longitude,
          criado_por: lote.criado_por,
          voluntarios: [...new Set(entregas?.map(e => e.voluntario_id) || [])],
          entregas: entregas?.map(e => e.id) || [],
          fotos: fotos?.map(f => f.foto_url) || [],
          hash_anterior: previousHash,
          indice_cadeia: lote.indice_cadeia
        };

        const newHash = generateChainedLoteHash(loteData, previousHash);

        // Atualizar o lote com o novo hash e hash anterior
        await supabase
          .from('lotes')
          .update({
            hash_integridade: newHash,
            hash_anterior: previousHash
          })
          .eq('id', lote.id);

        // O hash atual se torna o hash anterior do próximo lote
        previousHash = newHash;
      }

      toast({
        title: "Cadeia Reparada",
        description: `${lotesToRepair.length} lotes foram reparados na cadeia`,
      });

      // Revalidar após o reparo
      await validateChainIntegrity(unidade);

    } catch (error) {
      console.error('Erro no reparo da cadeia:', error);
      toast({
        title: "Erro no Reparo",
        description: "Não foi possível reparar a cadeia de integridade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    validateChainIntegrity,
    repairChainFromIndex,
    validationResult,
    loading
  };
};