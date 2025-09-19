import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  getOrganizationName, 
  ORGANIZATION_ADDRESSES, 
  ORGANIZATION_COORDINATES,
  formatPesoDisplay 
} from '@/lib/organizationUtils';
import { useUnifiedKPIs, type UnifiedKPIs } from './useUnifiedKPIs';

export interface LoteExtended {
  id: string;
  codigo: string;
  peso_inicial: number;
  peso_atual: number;
  data_inicio: string;
  data_finalizacao: string | null;
  data_proxima_transferencia: string | null;
  status: string;
  caixa_atual: number;
  semana_atual: number;
  criado_por_nome: string;
  unidade: string;
  iot_data: any;
  linha_producao: string;
  // Dados calculados para o componente
  validadorNome: string;
  voluntariosUnicos: number;
  temperatura: number;
  umidade: number;
  progressoPercentual: number;
  statusManejo: string;
}

export interface PublicMetrics extends UnifiedKPIs {
  // Adiciona propriedades específicas públicas se necessário
}

export interface PublicUnitData {
  unitCode: string;
  unitName: string;
  address: string;
  coordinates: { lat: number; lng: number };
  lotesAtivos: LoteExtended[];
  metrics: PublicMetrics;
  lastUpdate: string;
}

export const usePublicProductionBelt = (unitCode: string) => {
  const [data, setData] = useState<PublicUnitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Hook unificado para KPIs
  const { kpis, loading: kpisLoading } = useUnifiedKPIs(unitCode);

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar lotes ativos da unidade específica
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', unitCode)
        .in('status', ['ativo', 'em_processamento'])
        .gte('caixa_atual', 1)
        .lte('caixa_atual', 7)
        .order('caixa_atual', { ascending: true });

      if (lotesError) {
        console.error('Erro ao buscar lotes:', lotesError);
        throw new Error('Erro ao carregar dados dos lotes');
      }

      // Buscar dados de entregas para cada lote para calcular voluntários únicos
      const lotesExtended: LoteExtended[] = [];
      
      for (const lote of lotes || []) {
        // Buscar entregas do lote
        const { data: entregas } = await supabase
          .from('entregas')
          .select(`
            voluntario_id,
            voluntarios (
              id,
              nome
            )
          `)
          .eq('lote_codigo', lote.codigo);

        // Calcular voluntários únicos do lote
        const voluntariosUnicos = new Set(entregas?.map(e => e.voluntario_id) || []).size;

        // Simular dados IoT (em produção viriam de sensores reais)
        const iotData = lote.iot_data as any;
        const temperatura = iotData?.temperatura || Math.floor(Math.random() * (65 - 35) + 35);
        const umidade = iotData?.umidade || Math.floor(Math.random() * (70 - 40) + 40);

        // Calcular progresso baseado na semana atual
        const progressoPercentual = Math.min((lote.semana_atual / 7) * 100, 100);

        // Determinar status do manejo
        const statusManejo = lote.caixa_atual === 7 ? 'realizado' : 'pendente';

        lotesExtended.push({
          ...lote,
          validadorNome: lote.criado_por_nome,
          voluntariosUnicos,
          temperatura,
          umidade,
          progressoPercentual,
          statusManejo,
        });
      }

      // Montar dados públicos com KPIs unificados
      const publicData: PublicUnitData = {
        unitCode,
        unitName: getOrganizationName(unitCode),
        address: ORGANIZATION_ADDRESSES[unitCode as keyof typeof ORGANIZATION_ADDRESSES] || 'Endereço não disponível',
        coordinates: ORGANIZATION_COORDINATES[unitCode as keyof typeof ORGANIZATION_COORDINATES] || { lat: 0, lng: 0 },
        lotesAtivos: lotesExtended,
        metrics: kpis as PublicMetrics,
        lastUpdate: new Date().toISOString(),
      };

      setData(publicData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
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
    if (unitCode && !kpisLoading) {
      fetchPublicData();
      
      // Configurar auto-refresh a cada 30 segundos
      const interval = setInterval(fetchPublicData, 30000);
      
      return () => clearInterval(interval);
    }
  }, [unitCode, kpisLoading]);

  return {
    data,
    loading: loading || kpisLoading,
    error,
    refetch: fetchPublicData,
  };
};