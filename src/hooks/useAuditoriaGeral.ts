import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Unidade {
  id: string;
  codigo_unidade: string;
  nome: string;
  localizacao: string;
  total_lotes: number;
  lotes_ativos: number;
  lotes_finalizados: number;
}

interface LoteFinalizadoResult {
  id: string;
  codigo_unico: string;
  codigo: string;
  status: string;
  unidade_nome: string;
  unidade_codigo: string;
  data_finalizacao: string | null;
  co2eq_evitado: number | null;
  hash_integridade: string | null;
  peso_inicial: number | null;
  peso_final: number | null;
  peso_atual: number | null;
  criado_por_nome: string | null;
  data_inicio: string | null;
  semana_atual: number | null;
  caixa_atual: number | null;
  progresso_percent: number | null;
  total_fotos: number;
  total_entregas: number;
  total_manutencoes: number | null;
  total_count: number;
}

interface FilterState {
  unidade: string;
  dataInicio: string;
  dataFim: string;
  validador: string;
  status: string;
}

export const useAuditoriaGeral = () => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [lotesFinalizados, setLotesFinalizados] = useState<LoteFinalizadoResult[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    unidade: '',
    dataInicio: '',
    dataFim: '',
    validador: '',
    status: 'todos'
  });
  const { toast } = useToast();

  const fetchUnidades = async () => {
    try {
      setLoadingUnidades(true);
      const { data, error } = await supabase.rpc('get_todas_unidades');
      
      if (error) {
        console.error('Erro ao buscar unidades:', error);
        toast({
          title: 'Erro ao carregar unidades',
          description: 'Não foi possível carregar as unidades. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      setUnidades(data || []);
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado ao carregar as unidades.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUnidades(false);
    }
  };

  const fetchLotesFinalizados = async (page: number = 1, term: string = '', filterState?: FilterState) => {
    try {
      setLoadingLotes(true);
      const currentFilters = filterState || filters;
      
      // Converter datas para o formato correto
      const dataInicio = currentFilters.dataInicio ? new Date(currentFilters.dataInicio).toISOString().split('T')[0] : null;
      const dataFim = currentFilters.dataFim ? new Date(currentFilters.dataFim).toISOString().split('T')[0] : null;
      
      const { data, error } = await supabase.rpc('buscar_lotes_por_status', {
        pagina: page,
        termo_busca: term,
        unidade_filter: currentFilters.unidade || '',
        data_inicio: dataInicio,
        data_fim: dataFim,
        validador_filter: currentFilters.validador || '',
        status_filter: currentFilters.status || 'todos'
      });
      
      if (error) {
        console.error('Erro ao buscar lotes finalizados:', error);
        toast({
          title: 'Erro ao carregar lotes',
          description: 'Não foi possível carregar os lotes finalizados. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Garantir que os dados tenham as propriedades corretas
      const formattedData = (data || []).map((lote: any) => ({
        id: lote.id,
        codigo_unico: lote.codigo_unico,
        codigo: lote.codigo,
        status: lote.status,
        unidade_nome: lote.unidade_nome,
        unidade_codigo: lote.unidade_codigo,
        data_finalizacao: lote.data_finalizacao,
        co2eq_evitado: lote.co2eq_evitado,
        hash_integridade: lote.hash_integridade,
        peso_inicial: lote.peso_inicial,
        peso_final: lote.peso_final,
        peso_atual: lote.peso_atual,
        criado_por_nome: lote.criado_por_nome || null,
        data_inicio: lote.data_inicio,
        semana_atual: lote.semana_atual,
        caixa_atual: lote.caixa_atual,
        progresso_percent: lote.progresso_percent,
        total_fotos: lote.total_fotos || 0,
        total_entregas: lote.total_entregas || 0,
        total_manutencoes: lote.total_manutencoes || 0,
        total_count: lote.total_count
      }));

      setLotesFinalizados(formattedData);
      
      if (formattedData && formattedData.length > 0) {
        setTotalCount(formattedData[0].total_count);
      } else {
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Erro ao buscar lotes finalizados:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado ao carregar os lotes.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLotes(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    fetchLotesFinalizados(1, term, filters);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchLotesFinalizados(1, searchTerm, newFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLotesFinalizados(page, searchTerm, filters);
  };

  useEffect(() => {
    fetchUnidades();
    // Buscar apenas os primeiros 10 lotes
    fetchLotesFinalizados(1, '', {
      unidade: '',
      dataInicio: '',
      dataFim: '',
      validador: '',
      status: 'todos'
    });
  }, []);

  // Usar paginação de 10 itens para melhor experiência mobile
  const totalPages = Math.ceil(totalCount / 10);

  return {
    unidades,
    lotesFinalizados,
    loadingUnidades,
    loadingLotes,
    searchTerm,
    currentPage,
    totalPages,
    totalCount,
    filters,
    handleSearch,
    handleFiltersChange,
    handlePageChange,
    refetchUnidades: fetchUnidades,
    refetchLotes: () => fetchLotesFinalizados(currentPage, searchTerm, filters)
  };
};