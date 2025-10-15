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
  codigo_unico: string;
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

        // Dados IoT (placeholders até integração)
        const iotData = lote.iot_data as any;
        const temperatura = iotData?.temperatura || null;
        const umidade = iotData?.umidade || null;

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
      
      // Configurar listeners em tempo real
      const channel = supabase
        .channel(`public-production-${unitCode}`)
        
        // Listener para mudanças em lotes
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'lotes',
          filter: `unidade=eq.${unitCode}`
        }, (payload) => {
          console.log('Lote atualizado:', payload);
          
          setData(prev => {
            if (!prev) return prev;
            
            const { new: newLote, old: oldLote, eventType } = payload;
            
            if (eventType === 'DELETE') {
              return {
                ...prev,
                lotesAtivos: prev.lotesAtivos.filter(lote => lote.id !== oldLote.id)
              };
            }
            
            if (eventType === 'INSERT') {
              // Buscar dados completos do novo lote
              fetchPublicData();
              return prev;
            }
            
            if (eventType === 'UPDATE') {
              const updatedLotes = prev.lotesAtivos.map(lote => {
                if (lote.id === newLote.id) {
                  // Calcular progresso baseado na semana atual
                  const progressoPercentual = Math.min((newLote.semana_atual / 7) * 100, 100);
                  
                  // Determinar status do manejo
                  const statusManejo = newLote.caixa_atual === 7 ? 'realizado' : 'pendente';
                  
                  // Manter dados IoT existentes ou simular se não existir
                  const iotData = newLote.iot_data as any;
                  const temperatura = iotData?.temperatura || lote.temperatura;
                  const umidade = iotData?.umidade || lote.umidade;
                  
                  return {
                    ...lote,
                    ...newLote,
                    temperatura,
                    umidade,
                    progressoPercentual,
                    statusManejo,
                  };
                }
                return lote;
              });
              
              return {
                ...prev,
                lotesAtivos: updatedLotes,
                lastUpdate: new Date().toISOString(),
              };
            }
            
            return prev;
          });
        })
        
        // Listener para novas entregas
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'entregas'
        }, (payload) => {
          console.log('Nova entrega:', payload);
          
          const { lote_codigo } = payload.new;
          
          // Atualizar contadores de voluntários apenas para o lote específico
          setData(prev => {
            if (!prev) return prev;
            
            const lotesAtivos = prev.lotesAtivos.map(lote => {
              if (lote.codigo === lote_codigo) {
                return {
                  ...lote,
                  voluntariosUnicos: lote.voluntariosUnicos + 1 // Incremento aproximado
                };
              }
              return lote;
            });
            
            return {
              ...prev,
              lotesAtivos,
              lastUpdate: new Date().toISOString(),
            };
          });
        })
        
        // Listener para novas fotos
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'lote_fotos'
        }, (payload) => {
          console.log('Nova foto de lote:', payload);
          
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              lastUpdate: new Date().toISOString(),
            };
          });
        })
        
        .subscribe((status) => {
          console.log(`Canal realtime ${unitCode}:`, status);
        });
      
      return () => {
        console.log(`Removendo canal realtime ${unitCode}`);
        supabase.removeChannel(channel);
      };
    }
  }, [unitCode, kpisLoading]);

  return {
    data,
    loading: loading || kpisLoading,
    error,
    refetch: fetchPublicData,
  };
};