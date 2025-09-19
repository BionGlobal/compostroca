import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  getOrganizationName, 
  ORGANIZATION_ADDRESSES, 
  ORGANIZATION_COORDINATES,
  formatPesoDisplay 
} from '@/lib/organizationUtils';

interface LoteExtended {
  id: string;
  codigo: string;
  peso_inicial: number;
  peso_atual: number;
  data_inicio: string;
  data_proxima_transferencia: string | null;
  status: string;
  caixa_atual: number;
  semana_atual: number;
  criado_por_nome: string;
  unidade: string;
  iot_data: any;
  linha_producao: string;
}

interface PublicMetrics {
  lotesAtivos: number;
  pesoTotal: number;
  voluntariosEngajados: number;
  co2eEvitado: number;
  lastUpdate: string;
}

interface PublicUnitData {
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

  const calculateCO2eEvitado = (pesoTotal: number): number => {
    // Fator de conversão: 1kg de resíduo orgânico compostado evita ~0.4kg CO2e
    return pesoTotal * 0.4;
  };

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar lotes ativos da unidade específica
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', unitCode)
        .eq('status', 'ativo')
        .order('created_at', { ascending: true });

      if (lotesError) {
        console.error('Erro ao buscar lotes:', lotesError);
        throw new Error('Erro ao carregar dados dos lotes');
      }

      // Buscar voluntários únicos dos lotes ativos
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          voluntario_id,
          voluntarios (
            id,
            nome,
            unidade
          )
        `)
        .in('lote_codigo', lotes?.map(l => l.codigo) || []);

      if (entregasError) {
        console.error('Erro ao buscar entregas:', entregasError);
      }

      // Calcular voluntários únicos
      const voluntariosUnicos = new Set();
      entregas?.forEach(entrega => {
        if (entrega.voluntarios && entrega.voluntarios.unidade === unitCode) {
          voluntariosUnicos.add(entrega.voluntario_id);
        }
      });

      // Calcular métricas
      const pesoTotal = lotes?.reduce((sum, lote) => sum + (lote.peso_atual || 0), 0) || 0;
      const co2eEvitado = calculateCO2eEvitado(pesoTotal);

      const metrics: PublicMetrics = {
        lotesAtivos: lotes?.length || 0,
        pesoTotal,
        voluntariosEngajados: voluntariosUnicos.size,
        co2eEvitado,
        lastUpdate: new Date().toISOString(),
      };

      // Montar dados públicos
      const publicData: PublicUnitData = {
        unitCode,
        unitName: getOrganizationName(unitCode),
        address: ORGANIZATION_ADDRESSES[unitCode as keyof typeof ORGANIZATION_ADDRESSES] || 'Endereço não disponível',
        coordinates: ORGANIZATION_COORDINATES[unitCode as keyof typeof ORGANIZATION_COORDINATES] || { lat: 0, lng: 0 },
        lotesAtivos: lotes || [],
        metrics,
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
    if (unitCode) {
      fetchPublicData();
      
      // Configurar auto-refresh a cada 30 segundos
      const interval = setInterval(fetchPublicData, 30000);
      
      return () => clearInterval(interval);
    }
  }, [unitCode]);

  return {
    data,
    loading,
    error,
    refetch: fetchPublicData,
  };
};