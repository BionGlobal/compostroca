import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface HistoricoEvent {
  id: string;
  tipo: 'novo_lote' | 'manutencao' | 'lote_finalizado';
  data: string;
  lote_codigo: string;
  validador_nome: string;
  dados_especificos: any;
  fotos?: string[];
  geoloc?: { lat: number; lng: number };
  unidade: string;
}

export interface SearchFilters {
  query: string;
  tipo?: 'novo_lote' | 'manutencao' | 'lote_finalizado' | 'all';
  dataInicio?: string;
  dataFim?: string;
  validador?: string;
}

export const useHistoricoLotes = () => {
  const [historico, setHistorico] = useState<HistoricoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tipo: 'all'
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      
      // Buscar lotes finalizados (novo_lote) - limitar aos últimos 10
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'encerrado')
        .order('data_encerramento', { ascending: false })
        .limit(10);

      if (lotesError) throw lotesError;

      // Buscar manejos semanais - limitar aos últimos 10
      const { data: manejos, error: manejosError } = await supabase
        .from('manejo_semanal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (manejosError) throw manejosError;

      // Buscar dados dos lotes referenciados pelos manejos
      let lotesMap = new Map();
      if (manejos && manejos.length > 0) {
        const loteIds = [...new Set(manejos.map(m => m.lote_id))];
        const { data: lotesForManejos, error: lotesForManejosError } = await supabase
          .from('lotes')
          .select('id, codigo, unidade')
          .in('id', loteIds);

        if (lotesForManejosError) throw lotesForManejosError;

        // Criar mapa para lookup rápido
        lotesForManejos?.forEach(lote => {
          lotesMap.set(lote.id, lote);
        });
      }

      // Buscar lotes finalizados em caixa 7 (lote_finalizado) - limitar aos últimos 10
      const { data: lotesFinalizados, error: finalizadosError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'distribuido')
        .order('data_encerramento', { ascending: false })
        .limit(10);

      if (finalizadosError) throw finalizadosError;

      // Montar eventos do histórico
      const eventos: HistoricoEvent[] = [];

      // Eventos de novo lote (lotes encerrados da caixa 1)
      lotes?.forEach(lote => {
        eventos.push({
          id: `lote_${lote.id}`,
          tipo: 'novo_lote',
          data: lote.data_encerramento || lote.created_at,
          lote_codigo: lote.codigo,
          validador_nome: lote.criado_por_nome,
          dados_especificos: {
            peso_inicial: lote.peso_inicial,
            peso_atual: lote.peso_atual,
            data_inicio: lote.data_inicio,
            data_encerramento: lote.data_encerramento,
            linha_producao: lote.linha_producao,
            semana_atual: lote.semana_atual
          },
          geoloc: lote.latitude && lote.longitude ? {
            lat: Number(lote.latitude),
            lng: Number(lote.longitude)
          } : undefined,
          unidade: lote.unidade
        });
      });

      // Eventos de manutenção
      manejos?.forEach(manejo => {
        const loteData = lotesMap.get(manejo.lote_id);
        eventos.push({
          id: `manejo_${manejo.id}`,
          tipo: 'manutencao',
          data: manejo.created_at,
          lote_codigo: loteData?.codigo || 'N/A',
          validador_nome: 'Sistema', // TODO: buscar nome do usuário
          dados_especificos: {
            peso_antes: manejo.peso_antes,
            peso_depois: manejo.peso_depois,
            caixa_origem: manejo.caixa_origem,
            caixa_destino: manejo.caixa_destino,
            observacoes: manejo.observacoes,
            foto_url: manejo.foto_url
          },
          fotos: manejo.foto_url ? [manejo.foto_url] : [],
          geoloc: manejo.latitude && manejo.longitude ? {
            lat: Number(manejo.latitude),
            lng: Number(manejo.longitude)
          } : undefined,
          unidade: loteData?.unidade || 'CWB001'
        });
      });

      // Eventos de lote finalizado (distribuído)
      lotesFinalizados?.forEach(lote => {
        eventos.push({
          id: `finalizado_${lote.id}`,
          tipo: 'lote_finalizado',
          data: lote.data_encerramento || lote.updated_at,
          lote_codigo: lote.codigo,
          validador_nome: lote.criado_por_nome,
          dados_especificos: {
            peso_inicial: lote.peso_inicial,
            peso_final: lote.peso_atual,
            data_inicio: lote.data_inicio,
            data_encerramento: lote.data_encerramento,
            tempo_total: lote.data_encerramento ? 
              Math.ceil((new Date(lote.data_encerramento).getTime() - new Date(lote.data_inicio).getTime()) / (1000 * 60 * 60 * 24 * 7)) 
              : null,
            reducao_peso: ((lote.peso_inicial - lote.peso_atual) / lote.peso_inicial * 100)
          },
          geoloc: lote.latitude && lote.longitude ? {
            lat: Number(lote.latitude),
            lng: Number(lote.longitude)
          } : undefined,
          unidade: lote.unidade
        });
      });

      // Ordenar por data (mais recente primeiro) e limitar aos últimos 10
      eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      const eventosLimitados = eventos.slice(0, 10);
      
      setHistorico(eventosLimitados);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar eventos baseado nos filtros
  const eventosFiltrados = useMemo(() => {
    return historico.filter(evento => {
      const matchQuery = !filters.query || 
        evento.lote_codigo.toLowerCase().includes(filters.query.toLowerCase()) ||
        evento.validador_nome.toLowerCase().includes(filters.query.toLowerCase());
      
      const matchTipo = !filters.tipo || filters.tipo === 'all' || evento.tipo === filters.tipo;
      
      const matchDataInicio = !filters.dataInicio || 
        new Date(evento.data) >= new Date(filters.dataInicio);
      
      const matchDataFim = !filters.dataFim || 
        new Date(evento.data) <= new Date(filters.dataFim);

      return matchQuery && matchTipo && matchDataInicio && matchDataFim;
    });
  }, [historico, filters]);

  useEffect(() => {
    if (user) {
      fetchHistorico();
    }
  }, [user]);

  return {
    historico: eventosFiltrados,
    loading,
    filters,
    setFilters,
    refetch: fetchHistorico,
    totalEventos: historico.length,
    eventosFiltrados: eventosFiltrados.length
  };
};