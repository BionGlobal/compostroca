import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLoteUpdates } from '@/contexts/LoteContext';

export interface LoteExtended {
  id: string;
  codigo: string;
  codigo_unico: string;
  unidade: string;
  linha_producao: string;
  status: 'ativo' | 'em_processamento' | 'encerrado';
  caixa_atual: number;
  semana_atual: number;
  data_inicio: string;
  data_encerramento?: string;
  data_proxima_transferencia?: string;
  peso_inicial: number;
  peso_atual: number;
  latitude?: number;
  longitude?: number;
  criado_por: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
  
  // Campos calculados
  diasParaTransferencia: number;
  pesoEsperadoFinal: number;
  reducaoAcumulada: number;
  voluntariosUnicos: number;
  statusManejo: 'pendente' | 'realizado' | 'atrasado';
  progressoPercentual: number;
  dataEntradaCaixa: string;
  validadorNome: string;
  
  // Dados IoT (placeholders para futuro)
  temperatura?: number | null;
  umidade?: number | null;
  condutividade?: number | null;
  ph?: number | null;
  nitrogenio?: number | null;
  fosforo?: number | null;
  potassio?: number | null;
}

export interface ManejoRecord {
  id: string;
  lote_id: string;
  caixa_origem: number;
  caixa_destino: number;
  peso_antes: number;
  peso_depois: number;
  foto_url?: string;
  observacoes?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  user_id: string;
}

export interface ProductionMetrics {
  capacidadeUtilizada: number; // % das 7 caixas ocupadas
  pesoTotalCompostado: number; // peso bruto total compostado em toneladas
  co2eEvitado: number; // CO2e evitado em toneladas
  totalVoluntarios: number; // voluntários únicos que participaram
  totalEntregas: number; // total de entregas realizadas
  tempoMedioCiclo: number; // dias para completar processo
  taxaTransferencia: number; // pontualidade dos manejos
  totalLotesAtivos: number;
  totalLotesFinalizados: number;
  pesoBrutoProcessamento: number;
  compostoProduzido: number;
  // Métricas adicionais para cards de "Sistema de Lotes"
  voluntariosEngajadosAtivos: number; // voluntários únicos que entregaram para lotes ativos
  totalVoluntariosUnidade: number; // total de voluntários ativos na unidade
  co2eEvitadoAtivosKg: number; // CO2e evitado (kg) considerando somente lotes ativos
}

export const useLotesManager = () => {
  const [lotes, setLotes] = useState<LoteExtended[]>([]);
  const [lotesAtivos, setLotesAtivos] = useState<LoteExtended[]>([]);
  const [lotesFinalizados, setLotesFinalizados] = useState<LoteExtended[]>([]);
  const [manejos, setManejos] = useState<ManejoRecord[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    capacidadeUtilizada: 0,
    pesoTotalCompostado: 0,
    co2eEvitado: 0,
    totalVoluntarios: 0,
    totalEntregas: 0,
    tempoMedioCiclo: 0,
    taxaTransferencia: 0,
    totalLotesAtivos: 0,
    totalLotesFinalizados: 0,
    pesoBrutoProcessamento: 0,
    compostoProduzido: 0,
    voluntariosEngajadosAtivos: 0,
    totalVoluntariosUnidade: 0,
    co2eEvitadoAtivosKg: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { subscribeToLoteUpdates } = useLoteUpdates();

  const calcularPesoEsperado = (pesoInicial: number, semanaAtual: number): number => {
    // Taxa de decaimento: 3,65% por semana = fator 0,9635
    const fatorDecaimento = 0.9635;
    const peso = pesoInicial * Math.pow(fatorDecaimento, semanaAtual - 1);
    return Math.round(peso * 100) / 100;
  };

  const calcularPesoFinal = (pesoInicial: number): number => {
    return pesoInicial * 0.78; // 22% de redução = 78% do peso inicial
  };

  const calcularDiasTransferencia = (dataInicio: string, semanaAtual: number): number => {
    const inicio = new Date(dataInicio);
    const proximaTransferencia = new Date(inicio);
    proximaTransferencia.setDate(inicio.getDate() + (semanaAtual * 7));
    
    const hoje = new Date();
    const diffTime = proximaTransferencia.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const fetchVoluntariosUnicos = async (lotesCodigos: string[]): Promise<Record<string, number>> => {
    try {
      console.log('👥 Buscando voluntários únicos para lotes:', lotesCodigos);
      
      if (lotesCodigos.length === 0) {
        return {};
      }

      const { data: entregas, error } = await supabase
        .from('entregas')
        .select('lote_codigo, voluntario_id')
        .in('lote_codigo', lotesCodigos)
        .is('deleted_at', null);

      if (error) {
        console.error('Erro ao buscar entregas:', error);
        throw error;
      }

      console.log('📊 Entregas encontradas:', entregas);

      const voluntariosPorLote: Record<string, Set<string>> = {};
      entregas?.forEach(entrega => {
        if (entrega.lote_codigo) {
          if (!voluntariosPorLote[entrega.lote_codigo]) {
            voluntariosPorLote[entrega.lote_codigo] = new Set();
          }
          voluntariosPorLote[entrega.lote_codigo].add(entrega.voluntario_id);
        }
      });

      const resultado = Object.fromEntries(
        Object.entries(voluntariosPorLote).map(([codigo, voluntarios]) => [
          codigo,
          voluntarios.size
        ])
      );

      console.log('✅ Voluntários únicos por lote:', resultado);
      return resultado;
    } catch (error) {
      console.error('Erro ao buscar voluntários únicos:', error);
      return {};
    }
  };

  const fetchVoluntariosStats = async () => {
    try {
      if (!profile?.organization_code) return { totalVoluntarios: 0, totalEntregas: 0 };

      // Busca voluntários únicos da organização
      const { data: voluntariosData, error: voluntariosError } = await supabase
        .from('entregas')
        .select('voluntario_id')
        .eq('geolocalizacao_validada', true)
        .is('deleted_at', null);

      if (voluntariosError) throw voluntariosError;

      const voluntariosUnicos = new Set(voluntariosData?.map(e => e.voluntario_id) || []);

      // Busca total de entregas validadas
      const { count: totalEntregas, error: entregasError } = await supabase
        .from('entregas')
        .select('*', { count: 'exact' })
        .eq('geolocalizacao_validada', true);

      if (entregasError) throw entregasError;

      return {
        totalVoluntarios: voluntariosUnicos.size,
        totalEntregas: totalEntregas || 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de voluntários:', error);
      return { totalVoluntarios: 0, totalEntregas: 0 };
    }
  };

  const enrichLotes = async (lotesData: any[]): Promise<LoteExtended[]> => {
    const lotesCodigos = lotesData.map(lote => lote.codigo);
    const voluntariosData = await fetchVoluntariosUnicos(lotesCodigos);

    return lotesData.map(lote => {
      const diasParaTransferencia = calcularDiasTransferencia(lote.data_inicio, lote.semana_atual);
      const pesoEsperadoFinal = calcularPesoFinal(lote.peso_inicial);
      const pesoEsperadoAtual = calcularPesoEsperado(lote.peso_inicial, lote.semana_atual);
      const reducaoAcumulada = lote.peso_inicial > 0 ? ((lote.peso_inicial - lote.peso_atual) / lote.peso_inicial) * 100 : 0;
      
      let statusManejo: 'pendente' | 'realizado' | 'atrasado' = 'realizado';
      if (lote.status === 'ativo') {
        if (diasParaTransferencia < 0) {
          statusManejo = 'atrasado';
        } else if (diasParaTransferencia <= 1) {
          statusManejo = 'pendente';
        }
      }

      const progressoPercentual = (lote.semana_atual / 7) * 100;

      return {
        ...lote,
        diasParaTransferencia,
        pesoEsperadoFinal,
        reducaoAcumulada,
        voluntariosUnicos: voluntariosData[lote.codigo] || 0,
        statusManejo,
        progressoPercentual,
        dataEntradaCaixa: lote.data_inicio, // Placeholder - em produção seria calculado
        validadorNome: lote.criado_por_nome,
        // Dados IoT (placeholders até integração)
        temperatura: null,
        umidade: null,
        ph: null,
        condutividade: null,
        nitrogenio: null,
        fosforo: null,
        potassio: null,
      };
    });
  };

  const fetchLotes = async () => {
    try {
      setLoading(true);
      
      if (!profile?.organization_code) {
        console.log('❌ Organização não disponível');
        return;
      }

      console.log('🔄 Buscando lotes da organização:', profile.organization_code);

      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('📦 Lotes encontrados:', data);

      const enrichedLotes = await enrichLotes(data || []);
      setLotes(enrichedLotes);

      // Separa ativos e finalizados
      const ativos = enrichedLotes.filter(lote => lote.status === 'ativo' || lote.status === 'em_processamento');
      const finalizados = enrichedLotes.filter(lote => lote.status === 'encerrado');

      setLotesAtivos(ativos);
      setLotesFinalizados(finalizados);

      console.log('✅ Lotes ativos:', ativos.length, 'Finalizados:', finalizados.length);

      // Calcula métricas
      await calculateMetrics(ativos, finalizados);

    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async (ativos: LoteExtended[], finalizados: LoteExtended[]) => {
    const totalCaixas = 7;
    const caixasOcupadas = ativos.length;
    const capacidadeUtilizada = (caixasOcupadas / totalCaixas) * 100;

    // Peso total compostado (todos os lotes em toneladas)
    const pesoTotalTodosLotes = [...ativos, ...finalizados].reduce((acc, lote) => acc + lote.peso_inicial, 0);
    const pesoTotalCompostado = pesoTotalTodosLotes / 1000; // Converter para toneladas

    // CO2e evitado (baseado em lotes finalizados) em toneladas
    const pesoInicialFinalizados = finalizados.reduce((acc, lote) => acc + lote.peso_inicial, 0);
    const co2eEvitado = (pesoInicialFinalizados * 0.766) / 1000; // 1kg = 0.766kg CO2e, converter para toneladas

    // Buscar dados de voluntários gerais (existente)
    const voluntariosStats = await fetchVoluntariosStats();

    // Tempo médio de ciclo
    const tempoMedioCiclo = finalizados.length > 0
      ? finalizados.reduce((acc, lote) => {
          const inicio = new Date(lote.data_inicio);
          const fim = new Date(lote.data_encerramento || lote.data_inicio);
          return acc + (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / finalizados.length
      : 0;

    const manejosPendentes = ativos.filter(lote => lote.statusManejo === 'pendente').length;
    const manejosAtrasados = ativos.filter(lote => lote.statusManejo === 'atrasado').length;
    const taxaTransferencia = ativos.length > 0
      ? ((ativos.length - manejosPendentes - manejosAtrasados) / ativos.length) * 100
      : 100;

    const pesoBrutoProcessamento = ativos.reduce((acc, lote) => acc + lote.peso_atual, 0);
    const compostoProduzido = finalizados.reduce((acc, lote) => acc + lote.peso_atual, 0);

    // Novas métricas específicas dos lotes ATIVOS
    const ativosCodigos = ativos.map(l => l.codigo);
    let voluntariosEngajadosAtivos = 0;
    let totalVoluntariosUnidade = 0;

    if (ativosCodigos.length > 0) {
      const { data: entregasAtivos, error: entregasAtivosErr } = await supabase
        .from('entregas')
        .select('voluntario_id, lote_codigo')
        .in('lote_codigo', ativosCodigos);

      if (entregasAtivosErr) {
        console.error('Erro ao buscar voluntários engajados nos ativos:', entregasAtivosErr);
      } else {
        const setEngajados = new Set<string>();
        (entregasAtivos || []).forEach(e => {
          if (e.voluntario_id) setEngajados.add(e.voluntario_id);
        });
        voluntariosEngajadosAtivos = setEngajados.size;
      }
    }

    const { count: totalVolCount, error: volCountErr } = await supabase
      .from('voluntarios')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .eq('unidade', profile?.organization_code || '');

    if (volCountErr) {
      console.error('Erro ao contar voluntários da unidade:', volCountErr);
    } else {
      totalVoluntariosUnidade = totalVolCount || 0;
    }

    const co2eEvitadoAtivosKg = ativos.reduce((acc, lote) => acc + (lote.peso_inicial * 0.766), 0);

    setMetrics({
      capacidadeUtilizada,
      pesoTotalCompostado,
      co2eEvitado,
      totalVoluntarios: voluntariosStats.totalVoluntarios,
      totalEntregas: voluntariosStats.totalEntregas,
      tempoMedioCiclo,
      taxaTransferencia,
      totalLotesAtivos: ativos.length,
      totalLotesFinalizados: finalizados.length,
      pesoBrutoProcessamento,
      compostoProduzido,
      voluntariosEngajadosAtivos,
      totalVoluntariosUnidade,
      co2eEvitadoAtivosKg,
    });
  };

  const registrarManejo = async (
    loteId: string,
    pesoNovo: number,
    fotoUrl?: string,
    observacoes?: string
  ) => {
    try {
      const lote = lotes.find(l => l.id === loteId);
      if (!lote) throw new Error('Lote não encontrado');

      console.log('Registrando manejo:', {
        lote_id: loteId,
        caixa_origem: lote.caixa_atual,
        caixa_destino: lote.caixa_atual + 1,
        peso_antes: lote.peso_atual,
        peso_depois: pesoNovo,
        foto_url: fotoUrl,
        observacoes,
        user_id: user?.id,
      });
      
      const manejoError = null; // Temporário

      if (manejoError) throw manejoError;

      // Atualiza o lote
      const { error: loteError } = await supabase
        .from('lotes')
        .update({
          caixa_atual: lote.caixa_atual + 1,
          semana_atual: lote.semana_atual + 1,
          peso_atual: pesoNovo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loteId);

      if (loteError) throw loteError;

      toast({
        title: "Sucesso",
        description: "Manejo registrado e lote transferido",
      });

      // Recarrega dados
      fetchLotes();

    } catch (error) {
      console.error('Erro ao registrar manejo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o manejo",
        variant: "destructive",
      });
    }
  };

  const finalizarLote = async (loteId: string, pesoFinal: number) => {
    try {
      const { error } = await supabase
        .from('lotes')
        .update({
          status: 'encerrado',
          peso_atual: pesoFinal,
          data_encerramento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', loteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lote finalizado e pronto para distribuição",
      });

      fetchLotes();

    } catch (error) {
      console.error('Erro ao finalizar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o lote",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && profile?.organization_code) {
      console.log('🔄 Inicializando useLotesManager');
      fetchLotes();
    }
  }, [user, profile?.organization_code]);

  // Subscribe to lote updates from other hooks
  useEffect(() => {
    const unsubscribe = subscribeToLoteUpdates(() => {
      console.log('🔄 Recebida notificação de atualização - refazendo fetch');
      if (user && profile?.organization_code) {
        fetchLotes();
      }
    });

    return unsubscribe;
  }, [subscribeToLoteUpdates, user, profile?.organization_code]);

  return {
    lotes,
    lotesAtivos,
    lotesFinalizados,
    manejos,
    metrics,
    loading,
    registrarManejo,
    finalizarLote,
    refetch: fetchLotes,
  };
};
