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
  unidade_nome: string;
  unidade_codigo: string;
  data_finalizacao: string | null;
  co2eq_evitado: number | null;
  hash_integridade: string | null;
  peso_inicial: number | null;
  peso_final: number | null;
  total_count: number;
}

export const useAuditoriaGeral = () => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [lotesFinalizados, setLotesFinalizados] = useState<LoteFinalizadoResult[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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

  const fetchLotesFinalizados = async (page: number = 1, term: string = '') => {
    try {
      setLoadingLotes(true);
      const { data, error } = await supabase.rpc('buscar_lotes_finalizados', {
        pagina: page,
        termo_busca: term
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

      setLotesFinalizados(data || []);
      
      if (data && data.length > 0) {
        setTotalCount(data[0].total_count);
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
    fetchLotesFinalizados(1, term);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLotesFinalizados(page, searchTerm);
  };

  useEffect(() => {
    fetchUnidades();
    fetchLotesFinalizados();
  }, []);

  const totalPages = Math.ceil(totalCount / 20);

  return {
    unidades,
    lotesFinalizados,
    loadingUnidades,
    loadingLotes,
    searchTerm,
    currentPage,
    totalPages,
    totalCount,
    handleSearch,
    handlePageChange,
    refetchUnidades: fetchUnidades,
    refetchLotes: () => fetchLotesFinalizados(currentPage, searchTerm)
  };
};