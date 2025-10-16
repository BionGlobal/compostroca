import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateChainedLoteHash } from '@/lib/hashUtils';
import QRCode from 'qrcode';

export const useLoteFinalization = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const finalizeLote = async (loteId: string, pesoFinal: number) => {
    try {
      setLoading(true);

      // 1. Check if lote has all 7 weekly maintenances
      const { data: manutencoes, error: manutencoesError } = await supabase
        .rpc('lote_tem_7_manutencoes', { lote_id_param: loteId });

      if (manutencoesError) {
        throw new Error('Erro ao verificar manutenções: ' + manutencoesError.message);
      }

      if (!manutencoes) {
        throw new Error('Lote deve ter todas as 7 manutenções semanais para ser finalizado');
      }

      // 2. Get lote data for calculations
      const { data: lote, error: loteError } = await supabase
        .from('lotes')
        .select('*')
        .eq('id', loteId)
        .single();

      if (loteError || !lote) {
        throw new Error('Erro ao buscar dados do lote');
      }

      // 3. Calculate environmental impact
      const { data: impactData, error: impactError } = await supabase
        .rpc('calcular_impacto_lote', { lote_id_param: loteId });

      if (impactError || !impactData || impactData.length === 0) {
        throw new Error('Erro ao calcular impacto ambiental');
      }

      const { co2eq_evitado_calc, creditos_cau_calc } = impactData[0];

      // 4. Generate comprehensive hash with all related data
      const { data: entregas } = await supabase
        .from('entregas')
        .select(`
          id, peso, qualidade_residuo, created_at,
          voluntario_id, latitude, longitude
        `)
        .eq('lote_id', loteId);

      const { data: fotos } = await supabase
        .from('lote_fotos')
        .select('id, foto_url, tipo_foto, created_at')
        .eq('lote_id', loteId);

      const { data: manejoData } = await supabase
        .from('manejo_semanal')
        .select('id, peso_antes, peso_depois, observacoes, created_at')
        .eq('lote_id', loteId);

      // Get previous hash for blockchain chain
      const { data: previousHash } = await supabase
        .rpc('get_last_chain_hash', { unit_code: lote.unidade });

      const { data: nextIndex } = await supabase
        .rpc('get_next_chain_index');

      // Create comprehensive hash data
      const dataFinalizacao = new Date().toISOString();
      const hashData = {
        codigo: lote.codigo,
        unidade: lote.unidade,
        peso_inicial: lote.peso_inicial,
        peso_atual: pesoFinal,
        data_inicio: lote.data_inicio,
        data_encerramento: dataFinalizacao,
        criado_por: lote.criado_por,
        latitude: lote.latitude,
        longitude: lote.longitude,
        voluntarios: (entregas || []).map(e => e.voluntario_id),
        entregas: (entregas || []).map(e => `${e.id}-${e.peso}-${e.qualidade_residuo}`),
        fotos: (fotos || []).map(f => `${f.id}-${f.tipo_foto}`),
        hash_anterior: previousHash,
        indice_cadeia: nextIndex || 1
      };

      const integrityHash = generateChainedLoteHash(hashData, previousHash);

      // 5. Generate QR Code
      const auditUrl = `${window.location.origin}/lote/auditoria/${lote.codigo_unico || lote.codigo}`;
      const qrCodeDataUrl = await QRCode.toDataURL(auditUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // 6. Update lote with finalization data
      const { error: updateError } = await supabase
        .from('lotes')
        .update({
          status: 'encerrado',
          peso_final: pesoFinal,
          peso_atual: pesoFinal,
          data_finalizacao: new Date().toISOString(),
          data_encerramento: new Date().toISOString(),
          co2eq_evitado: co2eq_evitado_calc,
          creditos_cau: creditos_cau_calc,
          hash_integridade: integrityHash,
          hash_anterior: previousHash,
          indice_cadeia: nextIndex,
          qr_code_url: qrCodeDataUrl,
          codigo_unico: lote.codigo_unico || lote.codigo
        })
        .eq('id', loteId);

      if (updateError) {
        throw new Error('Erro ao finalizar lote: ' + updateError.message);
      }

      toast({
        title: "Lote finalizado com sucesso",
        description: `Lote ${lote.codigo} foi finalizado. CO2e evitado: ${co2eq_evitado_calc.toFixed(3)} kg, Créditos CAU: ${creditos_cau_calc.toFixed(3)}`,
      });

      return {
        success: true,
        loteData: {
          ...lote,
          peso_final: pesoFinal,
          co2eq_evitado: co2eq_evitado_calc,
          creditos_cau: creditos_cau_calc,
          hash_integridade: integrityHash,
          qr_code_url: qrCodeDataUrl
        }
      };

    } catch (error) {
      console.error('Erro ao finalizar lote:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível finalizar o lote",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    finalizeLote,
    loading
  };
};