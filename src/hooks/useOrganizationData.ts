import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Voluntario {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  numero_balde?: number;
  unidade: string;
  foto_url?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entrega {
  id: string;
  voluntario_id: string;
  peso: number;
  latitude?: number;
  longitude?: number;
  geolocalizacao_validada: boolean;
  lote_codigo?: string;
  observacoes?: string;
  qualidade_residuo?: number;
  created_at: string;
  updated_at: string;
  voluntario?: {
    nome: string;
    numero_balde?: number;
  };
}

export interface Lote {
  id: string;
  codigo: string;
  unidade: string;
  status: string;
  caixa_atual: number;
  semana_atual: number;
  data_inicio: string;
  data_encerramento?: string;
  peso_inicial: number;
  peso_atual: number;
  criado_por: string;
  criado_por_nome: string;
  linha_producao: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationStats {
  voluntariosAtivos: number;
  residuosColetados: number;
  lotesAndamento: number;
  lotesFinalizados: number;
  co2eEvitado: number;
  compostoProduzido: number;
}

interface OrganizationData {
  voluntarios: Voluntario[];
  entregas: Entrega[];
  lotes: Lote[];
  loteAtivo: Lote | null;
  voluntariosCount: number;
  stats: OrganizationStats;
  loading: {
    voluntarios: boolean;
    entregas: boolean;
    lotes: boolean;
    stats: boolean;
    initial: boolean;
  };
}

export const useOrganizationData = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<OrganizationData>({
    voluntarios: [],
    entregas: [],
    lotes: [],
    loteAtivo: null,
    voluntariosCount: 0,
    stats: {
      voluntariosAtivos: 0,
      residuosColetados: 0,
      lotesAndamento: 0,
      lotesFinalizados: 0,
      co2eEvitado: 0,
      compostoProduzido: 0,
    },
    loading: {
      voluntarios: true,
      entregas: true,
      lotes: true,
      stats: true,
      initial: true,
    }
  });

  const calculateStats = useCallback((voluntarios: Voluntario[], lotes: Lote[]): OrganizationStats => {
    const voluntariosAtivos = voluntarios.filter(v => v.ativo).length;
    const residuosColetados = lotes.reduce((total, lote) => total + (Number(lote.peso_atual) || 0), 0) / 1000;
    const lotesAndamento = lotes.filter(l => 
      (l.status === 'ativo' || l.status === 'em_processamento') && 
      l.caixa_atual >= 1 && l.caixa_atual <= 7
    ).length;
    const lotesFinalizados = lotes.filter(l => l.status === 'encerrado').length;
    const co2eEvitado = (residuosColetados * 0.766);
    const compostoProduzido = lotes
      .filter(l => l.status === 'encerrado')
      .reduce((total, lote) => total + (Number(lote.peso_atual) || 0), 0) / 1000;

    return {
      voluntariosAtivos,
      residuosColetados,
      lotesAndamento,
      lotesFinalizados,
      co2eEvitado,
      compostoProduzido,
    };
  }, []);

  const fetchVoluntarios = useCallback(async (organizationCode: string) => {
    try {
      const { data: voluntariosData, error } = await supabase
        .from('voluntarios')
        .select('*')
        .eq('unidade', organizationCode)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;
      return voluntariosData || [];
    } catch (error) {
      console.error('Erro ao buscar voluntários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os voluntários",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const fetchEntregas = useCallback(async (organizationCode: string) => {
    try {
      const { data: entregasData, error } = await supabase
        .from('entregas')
        .select(`
          *,
          voluntario:voluntarios(nome, numero_balde)
        `)
        .eq('voluntarios.unidade', organizationCode)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return entregasData || [];
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as entregas",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const fetchLotes = useCallback(async (organizationCode: string) => {
    try {
      const { data: lotesData, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', organizationCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return lotesData || [];
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lotes",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const fetchVoluntariosCount = useCallback(async (loteCode: string) => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('voluntario_id')
        .eq('lote_codigo', loteCode);

      if (error) throw error;
      
      const uniqueVoluntarios = new Set(data?.map(e => e.voluntario_id) || []);
      return uniqueVoluntarios.size;
    } catch (error) {
      console.error('Erro ao contar voluntários:', error);
      return 0;
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!profile?.organization_code || !user) {
      console.log('⚠️ Dados insuficientes para fetch:', { 
        hasProfile: !!profile, 
        hasOrgCode: !!profile?.organization_code, 
        hasUser: !!user 
      });
      return;
    }

    const organizationCode = profile.organization_code;
    console.log('🚀 Iniciando fetch de dados para organização:', organizationCode);

    // Marcar loading como true no início
    setData(prev => ({
      ...prev,
      loading: {
        voluntarios: true,
        entregas: true,
        lotes: true,
        stats: true,
        initial: true,
      }
    }));

    try {
      // Fetch all data in parallel com timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      const [voluntarios, entregas, lotes] = await Promise.race([
        Promise.all([
          fetchVoluntarios(organizationCode),
          fetchEntregas(organizationCode),
          fetchLotes(organizationCode)
        ]),
        timeoutPromise
      ]) as [Voluntario[], Entrega[], Lote[]];

      console.log('📊 Dados carregados:', {
        voluntarios: voluntarios.length,
        entregas: entregas.length,
        lotes: lotes.length
      });

      // Find active lote
      const loteAtivo = lotes.find(l => l.status === 'ativo' && l.caixa_atual === 1) || null;
      console.log('🎯 Lote ativo encontrado:', loteAtivo?.codigo || 'nenhum');
      
      // Count voluntarios for active lote
      let voluntariosCount = 0;
      if (loteAtivo) {
        try {
          voluntariosCount = await fetchVoluntariosCount(loteAtivo.codigo);
        } catch (countError) {
          console.error('⚠️ Erro ao contar voluntários:', countError);
          // Não bloquear o processo por isso
        }
      }

      // Calculate stats
      const stats = calculateStats(voluntarios, lotes);
      console.log('📈 Stats calculadas:', stats);

      setData(prev => ({
        ...prev,
        voluntarios,
        entregas,
        lotes,
        loteAtivo,
        voluntariosCount,
        stats,
        loading: {
          voluntarios: false,
          entregas: false,
          lotes: false,
          stats: false,
          initial: false,
        }
      }));

      console.log('✅ Fetch de dados concluído com sucesso');

    } catch (error: any) {
      console.error('💥 Erro ao carregar dados da organização:', error);
      
      // Marcar loading como false mesmo em caso de erro
      setData(prev => ({
        ...prev,
        loading: {
          voluntarios: false,
          entregas: false,
          lotes: false,
          stats: false,
          initial: false,
        }
      }));

      // Toast de erro apenas se não for timeout ou erro conhecido
      if (!error.message?.includes('Timeout')) {
        toast({
          title: "Erro ao Carregar Dados",
          description: "Não foi possível carregar os dados da organização. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  }, [profile?.organization_code, user, fetchVoluntarios, fetchEntregas, fetchLotes, fetchVoluntariosCount, calculateStats, toast]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!profile?.organization_code || !user) return;

    const organizationCode = profile.organization_code;

    // Subscribe to changes
    const voluntariosChannel = supabase
      .channel('voluntarios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voluntarios',
          filter: `unidade=eq.${organizationCode}`
        },
        () => {
          fetchVoluntarios(organizationCode).then(voluntarios => {
            setData(prev => ({
              ...prev,
              voluntarios,
              stats: calculateStats(voluntarios, prev.lotes)
            }));
          });
        }
      )
      .subscribe();

    const lotesChannel = supabase
      .channel('lotes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lotes',
          filter: `unidade=eq.${organizationCode}`
        },
        () => {
          fetchLotes(organizationCode).then(lotes => {
            const loteAtivo = lotes.find(l => l.status === 'ativo' && l.caixa_atual === 1) || null;
            setData(prev => ({
              ...prev,
              lotes,
              loteAtivo,
              stats: calculateStats(prev.voluntarios, lotes)
            }));
          });
        }
      )
      .subscribe();

    const entregasChannel = supabase
      .channel('entregas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entregas'
        },
        () => {
          fetchEntregas(organizationCode).then(entregas => {
            setData(prev => ({ ...prev, entregas }));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voluntariosChannel);
      supabase.removeChannel(lotesChannel);
      supabase.removeChannel(entregasChannel);
    };
  }, [profile?.organization_code, user, fetchVoluntarios, fetchLotes, fetchEntregas, calculateStats]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Actions
  const createVoluntario = useCallback(async (voluntarioData: Omit<Voluntario, 'id' | 'created_at' | 'updated_at' | 'ativo'>) => {
    try {
      const { data: newVoluntario, error } = await supabase
        .from('voluntarios')
        .insert({
          ...voluntarioData,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        voluntarios: [...prev.voluntarios, newVoluntario].sort((a, b) => a.nome.localeCompare(b.nome))
      }));

      toast({
        title: "Sucesso",
        description: "Voluntário criado com sucesso",
      });

      return newVoluntario;
    } catch (error) {
      console.error('Erro ao criar voluntário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o voluntário",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, toast]);

  const updateVoluntario = useCallback(async (id: string, voluntarioData: Partial<Voluntario>) => {
    try {
      const { data: updatedVoluntario, error } = await supabase
        .from('voluntarios')
        .update(voluntarioData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        voluntarios: prev.voluntarios.map(v => v.id === id ? updatedVoluntario : v)
      }));

      toast({
        title: "Sucesso",
        description: "Voluntário atualizado com sucesso",
      });

      return updatedVoluntario;
    } catch (error) {
      console.error('Erro ao atualizar voluntário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o voluntário",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const refetch = useCallback(async () => {
    console.log('🔄 Refetch solicitado para dados da organização');
    
    // Evitar refetch múltiplos simultâneos
    if (data.loading.initial) {
      console.log('⏳ Refetch já em andamento, ignorando');
      return;
    }
    
    try {
      await fetchAllData();
      console.log('✅ Refetch concluído com sucesso');
    } catch (error) {
      console.error('❌ Erro no refetch:', error);
    }
  }, [fetchAllData, data.loading.initial]);

  return {
    ...data,
    createVoluntario,
    updateVoluntario,
    refetch,
  };
};