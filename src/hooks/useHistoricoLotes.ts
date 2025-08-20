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
      
      // Buscar LOTES PRONTOS (finalizados/encerrados) - últimos 4
      const { data: lotesProntos, error: lotesProntosError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'encerrado')
        .order('data_encerramento', { ascending: false })
        .limit(4);

      if (lotesProntosError) throw lotesProntosError;

      // Buscar manejos semanais - últimos 4
      const { data: manejos, error: manejosError } = await supabase
        .from('manejo_semanal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (manejosError) throw manejosError;

      // Buscar NOVOS LOTES (recém-criados na caixa 1) - últimos 4
      const { data: novosLotes, error: novosLotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'em_processamento')
        .eq('caixa_atual', 1)
        .order('created_at', { ascending: false })
        .limit(4);

      if (novosLotesError) throw novosLotesError;

      if (manejosError) throw manejosError;

      // Buscar dados dos lotes e usuários para os manejos
      let lotesMap = new Map();
      let usersMap = new Map();
      
      if (manejos && manejos.length > 0) {
        const loteIds = [...new Set(manejos.map(m => m.lote_id))];
        const userIds = [...new Set(manejos.map(m => m.user_id))];
        
        // Buscar dados dos lotes
        const { data: lotesForManejos, error: lotesForManejosError } = await supabase
          .from('lotes')
          .select('id, codigo, unidade, linha_producao')
          .in('id', loteIds);

        if (lotesForManejosError) throw lotesForManejosError;

        // Buscar nomes dos usuários responsáveis
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        lotesForManejos?.forEach(lote => {
          lotesMap.set(lote.id, lote);
        });

        profiles?.forEach(profile => {
          usersMap.set(profile.user_id, profile.full_name || 'Usuário');
        });
      }

      // Função para buscar dados enriquecidos de entregas para um lote
      const getEntregasData = async (loteId: string, loteCodigo: string) => {
        const { data: entregas, error } = await supabase
          .from('entregas')
          .select(`
            id, peso, qualidade_residuo, voluntario_id,
            voluntarios!inner(id, nome)
          `)
          .eq('lote_codigo', loteCodigo);

        if (error) return { numVoluntarios: 0, qualidadeMedia: 0, pesoTotal: 0, fotosUrls: [] };

        const voluntarios = new Set(entregas?.map(e => e.voluntario_id) || []);
        const qualidades = entregas?.filter(e => e.qualidade_residuo).map(e => e.qualidade_residuo) || [];
        const qualidadeMedia = qualidades.length > 0 ? qualidades.reduce((a, b) => a + b, 0) / qualidades.length : 0;
        const pesoTotal = entregas?.reduce((sum, e) => sum + Number(e.peso), 0) || 0;

        // Buscar fotos das entregas
        const entregaIds = entregas?.map(e => e.id) || [];
        let fotosUrls: string[] = [];
        
        if (entregaIds.length > 0) {
          const { data: fotos } = await supabase
            .from('entrega_fotos')
            .select('foto_url')
            .in('entrega_id', entregaIds);
          
          fotosUrls = fotos?.map(f => f.foto_url) || [];
        }

        return {
          numVoluntarios: voluntarios.size,
          qualidadeMedia: Number(qualidadeMedia.toFixed(1)),
          pesoTotal,
          fotosUrls
        };
      };

      // Montar eventos do histórico
      const eventos: HistoricoEvent[] = [];

      // Eventos de NOVO LOTE (recém-criados na caixa 1)
      for (const lote of novosLotes || []) {
        const entregasData = await getEntregasData(lote.id, lote.codigo);
        
        eventos.push({
          id: `novo_lote_${lote.id}`,
          tipo: 'novo_lote',
          data: lote.created_at,
          lote_codigo: lote.codigo,
          validador_nome: lote.criado_por_nome,
          dados_especificos: {
            peso_inicial: lote.peso_inicial,
            peso_atual: lote.peso_atual,
            data_inicio: lote.data_inicio,
            linha_producao: lote.linha_producao,
            semana_atual: lote.semana_atual,
            num_voluntarios: entregasData.numVoluntarios,
            qualidade_media: entregasData.qualidadeMedia,
            peso_total_entregas: entregasData.pesoTotal,
            dados_iot: null // Removido dados simulados
          },
          fotos: entregasData.fotosUrls,
          geoloc: lote.latitude && lote.longitude ? {
            lat: Number(lote.latitude),
            lng: Number(lote.longitude)
          } : undefined,
          unidade: lote.unidade
        });
      }

      // Eventos de LOTE PRONTO (finalizados)
      for (const lote of lotesProntos || []) {
        const entregasData = await getEntregasData(lote.id, lote.codigo);
        
        eventos.push({
          id: `lote_pronto_${lote.id}`,
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
            reducao_peso: ((Number(lote.peso_inicial) - Number(lote.peso_atual)) / Number(lote.peso_inicial) * 100),
            num_voluntarios: entregasData.numVoluntarios,
            qualidade_media: entregasData.qualidadeMedia,
            dados_iot: null // Removido dados simulados
          },
          fotos: entregasData.fotosUrls,
          geoloc: lote.latitude && lote.longitude ? {
            lat: Number(lote.latitude),
            lng: Number(lote.longitude)
          } : undefined,
          unidade: lote.unidade
        });
      }

      // Eventos de MANUTENÇÃO REALIZADA
      for (const manejo of manejos || []) {
        const loteData = lotesMap.get(manejo.lote_id);
        const userName = usersMap.get(manejo.user_id) || 'Não informado';
        
        // Buscar todos os 7 lotes que estavam na esteira no momento da manutenção
        const { data: lotesNaEsteira } = await supabase
          .from('lotes')
          .select('codigo')
          .eq('linha_producao', loteData?.linha_producao || 'A')
          .eq('unidade', loteData?.unidade || 'CWB001')
          .gte('caixa_atual', 1)
          .lte('caixa_atual', 7)
          .order('caixa_atual', { ascending: true });

        const codigosLotes = lotesNaEsteira?.map(l => l.codigo) || [loteData?.codigo || 'Não informado'];
        
        eventos.push({
          id: `manutencao_${manejo.id}`,
          tipo: 'manutencao',
          data: manejo.created_at,
          lote_codigo: codigosLotes.join(', '),
          validador_nome: userName,
          dados_especificos: {
            peso_antes: manejo.peso_antes || 'Não informado',
            peso_depois: manejo.peso_depois || 'Não informado',
            caixa_origem: manejo.caixa_origem || 'Não informado',
            caixa_destino: manejo.caixa_destino || 'Não informado',
            observacoes: manejo.observacoes || 'Não informado',
            foto_url: manejo.foto_url || null,
            linha_producao: loteData?.linha_producao || 'Não informado',
            lotes_na_esteira: codigosLotes,
            total_lotes_esteira: codigosLotes.length
          },
          fotos: manejo.foto_url ? [manejo.foto_url] : [],
          geoloc: manejo.latitude && manejo.longitude ? {
            lat: Number(manejo.latitude),
            lng: Number(manejo.longitude)
          } : undefined,
          unidade: loteData?.unidade || 'CWB001'
        });
      }

      // Ordenar por data (mais recente primeiro) e limitar aos últimos 12
      eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      const eventosLimitados = eventos.slice(0, 12);
      
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