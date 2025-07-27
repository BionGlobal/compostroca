import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface LoteExtended {
  id: string;
  codigo: string;
  unidade: string;
  linha_producao: string;
  status: 'ativo' | 'encerrado';
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
  eficienciaReducao: number; // % médio de redução de peso
  tempoMedioCiclo: number; // dias para completar processo
  taxaTransferencia: number; // pontualidade dos manejos
  totalLotesAtivos: number;
  totalLotesFinalizados: number;
  pesoBrutoProcessamento: number;
  compostoProduzido: number;
}

export const useLotesManager = () => {
  const [lotes, setLotes] = useState<LoteExtended[]>([]);
  const [lotesAtivos, setLotesAtivos] = useState<LoteExtended[]>([]);
  const [lotesFinalizados, setLotesFinalizados] = useState<LoteExtended[]>([]);
  const [manejos, setManejos] = useState<ManejoRecord[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    capacidadeUtilizada: 0,
    eficienciaReducao: 0,
    tempoMedioCiclo: 0,
    taxaTransferencia: 0,
    totalLotesAtivos: 0,
    totalLotesFinalizados: 0,
    pesoBrutoProcessamento: 0,
    compostoProduzido: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Calcula peso esperado com redução de 3.15% por transferência
  const calcularPesoEsperado = (pesoInicial: number, semanaAtual: number): number => {
    const reducaoPorSemana = 0.0315; // 3.15%
    let peso = pesoInicial;
    for (let i = 1; i < semanaAtual; i++) {
      peso *= (1 - reducaoPorSemana);
    }
    return peso;
  };

  // Calcula peso final esperado (22% de redução total)
  const calcularPesoFinal = (pesoInicial: number): number => {
    return pesoInicial * 0.78; // 22% de redução = 78% do peso inicial
  };

  // Calcula dias até próxima transferência
  const calcularDiasTransferencia = (dataInicio: string, semanaAtual: number): number => {
    const inicio = new Date(dataInicio);
    const proximaTransferencia = new Date(inicio);
    proximaTransferencia.setDate(inicio.getDate() + (semanaAtual * 7));
    
    const hoje = new Date();
    const diffTime = proximaTransferencia.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Busca dados de voluntários únicos por lote
  const fetchVoluntariosUnicos = async (lotesCodigos: string[]): Promise<Record<string, number>> => {
    try {
      const { data: entregas, error } = await supabase
        .from('entregas')
        .select('lote_codigo, voluntario_id')
        .in('lote_codigo', lotesCodigos);

      if (error) throw error;

      const voluntariosPorLote: Record<string, Set<string>> = {};
      entregas?.forEach(entrega => {
        if (entrega.lote_codigo) {
          if (!voluntariosPorLote[entrega.lote_codigo]) {
            voluntariosPorLote[entrega.lote_codigo] = new Set();
          }
          voluntariosPorLote[entrega.lote_codigo].add(entrega.voluntario_id);
        }
      });

      return Object.fromEntries(
        Object.entries(voluntariosPorLote).map(([codigo, voluntarios]) => [
          codigo,
          voluntarios.size
        ])
      );
    } catch (error) {
      console.error('Erro ao buscar voluntários únicos:', error);
      return {};
    }
  };

  // Enriquece lotes com dados calculados
  const enrichLotes = async (lotesData: any[]): Promise<LoteExtended[]> => {
    const lotesCodigos = lotesData.map(lote => lote.codigo);
    const voluntariosData = await fetchVoluntariosUnicos(lotesCodigos);

    return lotesData.map(lote => {
      const diasParaTransferencia = calcularDiasTransferencia(lote.data_inicio, lote.semana_atual);
      const pesoEsperadoFinal = calcularPesoFinal(lote.peso_inicial);
      const pesoEsperadoAtual = calcularPesoEsperado(lote.peso_inicial, lote.semana_atual);
      const reducaoAcumulada = ((lote.peso_inicial - lote.peso_atual) / lote.peso_inicial) * 100;
      
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
      };
    });
  };

  // Busca todos os lotes
  const fetchLotes = async () => {
    try {
      setLoading(true);
      
      if (!profile?.organization_code) return;

      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedLotes = await enrichLotes(data || []);
      setLotes(enrichedLotes);

      // Separa ativos e finalizados
      const ativos = enrichedLotes.filter(lote => lote.status === 'ativo');
      const finalizados = enrichedLotes.filter(lote => lote.status === 'encerrado');

      setLotesAtivos(ativos);
      setLotesFinalizados(finalizados);

      // Calcula métricas
      calculateMetrics(ativos, finalizados);

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

  // Calcula métricas de produção
  const calculateMetrics = (ativos: LoteExtended[], finalizados: LoteExtended[]) => {
    const totalCaixas = 7;
    const caixasOcupadas = ativos.length;
    const capacidadeUtilizada = (caixasOcupadas / totalCaixas) * 100;

    const eficienciaReducao = finalizados.length > 0
      ? finalizados.reduce((acc, lote) => acc + lote.reducaoAcumulada, 0) / finalizados.length
      : 0;

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
    const compostoProduzido = finalizados.reduce((acc, lote) => acc + (lote.peso_inicial * 0.78), 0);

    setMetrics({
      capacidadeUtilizada,
      eficienciaReducao,
      tempoMedioCiclo,
      taxaTransferencia,
      totalLotesAtivos: ativos.length,
      totalLotesFinalizados: finalizados.length,
      pesoBrutoProcessamento,
      compostoProduzido,
    });
  };

  // Registra manejo semanal
  const registrarManejo = async (
    loteId: string,
    pesoNovo: number,
    fotoUrl?: string,
    observacoes?: string
  ) => {
    try {
      const lote = lotes.find(l => l.id === loteId);
      if (!lote) throw new Error('Lote não encontrado');

      // Registra o manejo
      const { error: manejoError } = await supabase
        .from('manejo_semanal')
        .insert({
          lote_id: loteId,
          caixa_origem: lote.caixa_atual,
          caixa_destino: lote.caixa_atual + 1,
          peso_antes: lote.peso_atual,
          peso_depois: pesoNovo,
          foto_url: fotoUrl,
          observacoes,
          user_id: user?.id,
        });

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

  // Finaliza lote (caixa 7)
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
      fetchLotes();
    }
  }, [user, profile?.organization_code]);

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