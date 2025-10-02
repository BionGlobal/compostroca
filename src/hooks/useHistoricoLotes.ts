import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Legacy interface for backward compatibility
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

export interface LoteHistorico {
  id: string;
  codigo: string;
  status: string;
  caixa_atual: number;
  peso_inicial?: number | null;
  peso_atual?: number | null;
  peso_final?: number | null;
  data_inicio: string;
  data_encerramento?: string | null;
  created_at: string;
  unidade: string;
  criado_por_nome: string;
  // Dados enriquecidos
  num_voluntarios: number;
  voluntariosCount?: number; // Para compatibilidade
  qualidade_media: number;
  co2e_evitado: number;
  tempo_processamento?: number; // em semanas
  taxa_reducao?: number; // percentual
  // Dados de geolocalização
  latitude?: number | null;
  longitude?: number | null;
  hash_integridade?: string; // Hash de integridade para lotes finalizados
}

export interface SearchFilters {
  query: string;
  tipo?: 'novo_lote' | 'lote_finalizado' | 'all';
  dataInicio?: string;
  dataFim?: string;
  validador?: string;
}

export const useHistoricoLotes = () => {
  const [novosLotes, setNovosLotes] = useState<LoteHistorico[]>([]);
  const [lotesProntos, setLotesProntos] = useState<LoteHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tipo: 'all'
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchHistoricoLotes = async () => {
    try {
      setLoading(true);
      
      // Função para buscar dados enriquecidos de entregas por data de criação do lote
      const getEntregasDataByDate = async (loteCodigo: string, dataInicio: string) => {
        // Primeiro tentar buscar por código do lote
        let { data: entregas } = await supabase
          .from('entregas')
          .select(`
            id, peso, qualidade_residuo, voluntario_id, latitude, longitude,
            voluntarios!inner(id, nome, numero_balde)
          `)
          .eq('lote_codigo', loteCodigo);

        // Se não encontrou por código, buscar por data de criação
        if (!entregas || entregas.length === 0) {
          const dataInicioFormatted = new Date(dataInicio).toISOString().split('T')[0];
          const { data: entregasPorData } = await supabase
            .from('entregas')
            .select(`
              id, peso, qualidade_residuo, voluntario_id, latitude, longitude, created_at,
              voluntarios!inner(id, nome, numero_balde)
            `)
            .gte('created_at', `${dataInicioFormatted}T00:00:00.000Z`)
            .lt('created_at', `${dataInicioFormatted}T23:59:59.999Z`);
          
          entregas = entregasPorData || [];
        }

        if (!entregas || entregas.length === 0) {
          return { 
            numVoluntarios: 0, 
            qualidadeMedia: 0, 
            pesoTotal: 0, 
            latitude: null, 
            longitude: null 
          };
        }

        const voluntarios = new Set(entregas.map(e => e.voluntario_id));
        const qualidades = entregas.filter(e => e.qualidade_residuo && e.qualidade_residuo > 0).map(e => e.qualidade_residuo);
        // Qualidade em escala de 1-3
        const qualidadeMedia = qualidades.length > 0 ? qualidades.reduce((a, b) => a + b, 0) / qualidades.length : 0;
        const pesoTotal = entregas.reduce((sum, e) => sum + Number(e.peso), 0);
        
        // Pegar coordenadas da primeira entrega com localização válida
        const entregaComLocalizacao = entregas.find(e => e.latitude && e.longitude);

        return {
          numVoluntarios: voluntarios.size,
          qualidadeMedia: Number(qualidadeMedia.toFixed(1)),
          pesoTotal,
          latitude: entregaComLocalizacao?.latitude || null,
          longitude: entregaComLocalizacao?.longitude || null
        };
      };

      // Buscar NOVOS LOTES (mais recentes em processamento) - últimos 6
      const { data: novosLotesData, error: novosLotesError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'em_processamento')
        .order('created_at', { ascending: false })
        .limit(6);

      if (novosLotesError) throw novosLotesError;

      // Buscar LOTES PRONTOS (finalizados/encerrados) - últimos 6
      const { data: lotesProntosData, error: lotesProntosError } = await supabase
        .from('lotes')
        .select('*')
        .eq('status', 'encerrado')
        .order('data_encerramento', { ascending: false })
        .limit(6);

      if (lotesProntosError) throw lotesProntosError;

      // Função para buscar geolocalização do manejo final (caixa 7)
      const getManejoFinalGeolocalizacao = async (loteId: string) => {
        const { data: manejoFinal } = await supabase
          .from('manejo_semanal')
          .select('latitude, longitude')
          .eq('lote_id', loteId)
          .eq('caixa_origem', 7)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        return manejoFinal ? {
          latitude: manejoFinal.latitude,
          longitude: manejoFinal.longitude
        } : { latitude: null, longitude: null };
      };

      // Processar novos lotes
      const novosLotesProcessados: LoteHistorico[] = [];
      for (const lote of novosLotesData || []) {
        const entregasData = await getEntregasDataByDate(lote.codigo, lote.data_inicio);
        const pesoInicial = Number(lote.peso_inicial) || 0;
        
        novosLotesProcessados.push({
          id: lote.id,
          codigo: lote.codigo,
          status: lote.status,
          caixa_atual: lote.caixa_atual,
          peso_inicial: lote.peso_inicial,
          peso_atual: lote.peso_atual,
          peso_final: null,
          data_inicio: lote.data_inicio,
          data_encerramento: null,
          created_at: lote.created_at,
          unidade: lote.unidade,
          criado_por_nome: lote.criado_por_nome,
          num_voluntarios: entregasData.numVoluntarios,
          qualidade_media: entregasData.qualidadeMedia,
          co2e_evitado: 0, // CO2e em branco para novos lotes
          tempo_processamento: undefined,
          taxa_reducao: undefined,
          latitude: entregasData.latitude,
          longitude: entregasData.longitude
        });
      }

      // Processar lotes prontos
      const lotesProntosProcessados: LoteHistorico[] = [];
      for (const lote of lotesProntosData || []) {
        const entregasData = await getEntregasDataByDate(lote.codigo, lote.data_inicio);
        const manejoGeoData = await getManejoFinalGeolocalizacao(lote.id);
        const pesoInicial = Number(lote.peso_inicial) || 0;
        const pesoFinal = Number(lote.peso_final) || Number(lote.peso_atual) || 0;
        const taxaReducao = pesoInicial > 0 ? ((pesoInicial - pesoFinal) / pesoInicial) * 100 : 0;
        
        lotesProntosProcessados.push({
          id: lote.id,
          codigo: lote.codigo,
          status: lote.status,
          caixa_atual: lote.caixa_atual,
          peso_inicial: lote.peso_inicial,
          peso_atual: lote.peso_atual,
          peso_final: lote.peso_final || lote.peso_atual, // Para lotes finalizados
          data_inicio: lote.data_inicio,
          data_encerramento: lote.data_encerramento,
          created_at: lote.created_at,
          unidade: lote.unidade,
          criado_por_nome: lote.criado_por_nome,
          num_voluntarios: entregasData.numVoluntarios,
          voluntariosCount: entregasData.numVoluntarios, // Adicionar para compatibilidade
          qualidade_media: entregasData.qualidadeMedia,
          co2e_evitado: pesoInicial * 0.766, // Formula especificada
          tempo_processamento: undefined, // Removido tempo de processamento
          taxa_reducao: taxaReducao,
          latitude: manejoGeoData.latitude || entregasData.latitude,
          longitude: manejoGeoData.longitude || entregasData.longitude
        });
      }

      setNovosLotes(novosLotesProcessados);
      setLotesProntos(lotesProntosProcessados);
      
    } catch (error) {
      console.error('Erro ao buscar histórico de lotes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de lotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Combinar e filtrar lotes baseado nos filtros
  const lotesFiltrados = useMemo(() => {
    let todosLotes: LoteHistorico[] = [];
    
    // Adicionar com base no filtro de tipo
    if (filters.tipo === 'all' || filters.tipo === 'novo_lote') {
      todosLotes = [...todosLotes, ...novosLotes];
    }
    if (filters.tipo === 'all' || filters.tipo === 'lote_finalizado') {
      todosLotes = [...todosLotes, ...lotesProntos];
    }
    
    // Filtrar por busca
    return todosLotes.filter(lote => {
      const matchQuery = !filters.query || 
        lote.codigo.toLowerCase().includes(filters.query.toLowerCase()) ||
        lote.criado_por_nome.toLowerCase().includes(filters.query.toLowerCase());
      
      const dataReferencia = lote.data_encerramento || lote.created_at;
      const matchDataInicio = !filters.dataInicio || 
        new Date(dataReferencia) >= new Date(filters.dataInicio);
      
      const matchDataFim = !filters.dataFim || 
        new Date(dataReferencia) <= new Date(filters.dataFim);

      return matchQuery && matchDataInicio && matchDataFim;
    }).sort((a, b) => {
      // Ordenar por data mais recente primeiro
      const dataA = new Date(a.data_encerramento || a.created_at).getTime();
      const dataB = new Date(b.data_encerramento || b.created_at).getTime();
      return dataB - dataA;
    });
  }, [novosLotes, lotesProntos, filters]);

  useEffect(() => {
    if (user) {
      fetchHistoricoLotes();
    }
  }, [user]);

  return {
    novosLotes,
    lotesProntos,
    lotesFiltrados,
    loading,
    filters,
    setFilters,
    refetch: fetchHistoricoLotes,
    totalLotes: novosLotes.length + lotesProntos.length,
    lotesFiltradosCount: lotesFiltrados.length
  };
};