import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedKPIs {
  // Dados Ativos (Parciais)
  lotesAtivos: number;
  pesoAtivo: number; // kg
  voluntariosEngajados: number;
  co2eAtivo: number; // kg

  // Dados Totais (Históricos)
  lotesTotal: number;
  pesoTotal: number; // toneladas
  voluntariosTotal: number;
  co2eTotal: number; // toneladas
  
  // Porcentagens
  engajamentoPercentual: number;
  
  // Meta
  lastUpdate: string;
}

export const useUnifiedKPIs = (unitCode: string) => {
  const [kpis, setKpis] = useState<UnifiedKPIs>({
    lotesAtivos: 0,
    pesoAtivo: 0,
    voluntariosEngajados: 0,
    co2eAtivo: 0,
    lotesTotal: 0,
    pesoTotal: 0,
    voluntariosTotal: 0,
    co2eTotal: 0,
    engajamentoPercentual: 0,
    lastUpdate: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fator CO2e padrão - estudo Embrapa
  const CO2E_FACTOR = 0.766; // kg CO2e por kg de resíduo compostado

  const calculateKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar todos os lotes da unidade
      const { data: allLotes, error: lotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', unitCode)
        .order('created_at', { ascending: false });

      if (lotesError) throw lotesError;

      // 2. Buscar todos os voluntários da unidade
      const { data: voluntarios, error: voluntariosError } = await supabase
        .from('voluntarios')
        .select('id, ativo')
        .eq('unidade', unitCode)
        .is('deleted_at', null);

      if (voluntariosError) throw voluntariosError;

      // 3. Buscar entregas para calcular engajamento
      const lotesAtivos = allLotes?.filter(l => 
        (l.status === 'ativo' || l.status === 'em_processamento') && 
        l.caixa_atual >= 1 && l.caixa_atual <= 7
      ) || [];

      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          voluntario_id,
          lote_codigo,
          voluntarios!inner (
            id,
            unidade
          )
        `)
        .eq('voluntarios.unidade', unitCode)
        .in('lote_codigo', lotesAtivos.map(l => l.codigo));

      if (entregasError) console.warn('Erro ao buscar entregas:', entregasError);

      // === CALCULAR DADOS ATIVOS (PARCIAIS) ===
      const activeKpis = {
        lotesAtivos: lotesAtivos.length,
        pesoAtivo: lotesAtivos.reduce((sum, lote) => sum + (lote.peso_atual || 0), 0),
        voluntariosEngajados: new Set(entregas?.map(e => e.voluntario_id) || []).size,
        co2eAtivo: 0, // calculado abaixo
      };

      activeKpis.co2eAtivo = activeKpis.pesoAtivo * CO2E_FACTOR;

      // === CALCULAR DADOS TOTAIS (HISTÓRICOS) ===
      const totalKpis = {
        lotesTotal: allLotes?.length || 0,
        pesoTotal: (allLotes?.reduce((sum, lote) => {
          // Para lotes finalizados, usar peso_final; para outros, peso_atual
          const peso = lote.status === 'encerrado' ? (lote.peso_final || lote.peso_atual) : lote.peso_atual;
          return sum + (peso || 0);
        }, 0) || 0) / 1000, // converter para toneladas
        voluntariosTotal: voluntarios?.filter(v => v.ativo).length || 0,
        co2eTotal: 0, // calculado abaixo
      };

      totalKpis.co2eTotal = (totalKpis.pesoTotal * 1000 * CO2E_FACTOR) / 1000; // em toneladas

      // === CALCULAR PORCENTAGENS ===
      const engajamentoPercentual = totalKpis.voluntariosTotal > 0 
        ? (activeKpis.voluntariosEngajados / totalKpis.voluntariosTotal) * 100 
        : 0;

      const finalKpis: UnifiedKPIs = {
        ...activeKpis,
        ...totalKpis,
        engajamentoPercentual,
        lastUpdate: new Date().toISOString(),
      };

      setKpis(finalKpis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular KPIs';
      setError(errorMessage);
      console.error('Erro ao calcular KPIs:', err);
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unitCode) {
      calculateKPIs();
    }
  }, [unitCode]);

  return {
    kpis,
    loading,
    error,
    refetch: calculateKPIs,
  };
};