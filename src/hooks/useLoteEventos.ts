import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LoteEvento {
  id: string;
  lote_id: string;
  tipo_evento: 'inicio' | 'manutencao' | 'finalizacao';
  etapa_numero: number;
  data_evento: string;
  peso_antes: number | null;
  peso_depois: number;
  caixa_origem: number | null;
  caixa_destino: number | null;
  latitude: number | null;
  longitude: number | null;
  administrador_id: string | null;
  administrador_nome: string;
  observacoes: string | null;
  fotos_compartilhadas: string[];
  dados_especificos: Record<string, any>;
  hash_evento: string | null;
  created_at: string;
}

export const useLoteEventos = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Buscar todos os eventos de um lote
   */
  // Buscar ou criar sessão de manutenção
  const buscarOuCriarSessao = async (
    dataSessao: string,
    administradorId: string,
    administradorNome: string,
    unidadeCodigo: string,
    latitude?: number,
    longitude?: number,
    fotosGerais: string[] = [],
    observacoesGerais?: string
  ): Promise<string | null> => {
    try {
      // Buscar sessão existente no mesmo dia/administrador/unidade
      const dataInicio = new Date(dataSessao);
      dataInicio.setHours(0, 0, 0, 0);
      const dataFim = new Date(dataSessao);
      dataFim.setHours(23, 59, 59, 999);

      const { data: sessaoExistente, error: searchError } = await supabase
        .from('sessoes_manutencao')
        .select('id')
        .eq('unidade_codigo', unidadeCodigo)
        .eq('administrador_id', administradorId)
        .gte('data_sessao', dataInicio.toISOString())
        .lte('data_sessao', dataFim.toISOString())
        .is('deleted_at', null)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Erro ao buscar sessão:', searchError);
        return null;
      }

      // Se já existe, retornar ID
      if (sessaoExistente) {
        return sessaoExistente.id;
      }

      // Criar nova sessão
      const { data: novaSessao, error: insertError } = await supabase
        .from('sessoes_manutencao')
        .insert({
          data_sessao: dataSessao,
          administrador_id: administradorId,
          administrador_nome: administradorNome,
          unidade_codigo: unidadeCodigo,
          latitude,
          longitude,
          fotos_gerais: fotosGerais,
          observacoes_gerais: observacoesGerais
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar sessão:', insertError);
        return null;
      }

      return novaSessao.id;
    } catch (error) {
      console.error('Erro ao buscar/criar sessão:', error);
      return null;
    }
  };

  const fetchEventosByLote = async (loteId: string): Promise<LoteEvento[]> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lote_eventos')
        .select(`
          *,
          sessoes_manutencao (
            fotos_gerais,
            observacoes_gerais,
            data_sessao,
            administrador_nome
          )
        `)
        .eq('lote_id', loteId)
        .is('deleted_at', null)
        .order('etapa_numero', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos do lote:', error);
        return [];
      }

      const eventos: LoteEvento[] = (data || []).map(evento => {
        const fotosArray = Array.isArray(evento.fotos_compartilhadas) 
          ? evento.fotos_compartilhadas 
          : [];
        
        const dadosEspecificos = typeof evento.dados_especificos === 'object' && evento.dados_especificos !== null
          ? evento.dados_especificos as Record<string, any>
          : {};
        
        return {
          id: evento.id,
          lote_id: evento.lote_id,
          tipo_evento: (evento.tipo_evento || 'manutencao') as 'inicio' | 'manutencao' | 'finalizacao',
          etapa_numero: evento.etapa_numero,
          data_evento: evento.data_evento,
          peso_antes: evento.peso_antes,
          peso_depois: evento.peso_depois,
          caixa_origem: evento.caixa_origem,
          caixa_destino: evento.caixa_destino,
          latitude: evento.latitude,
          longitude: evento.longitude,
          administrador_id: evento.administrador_id,
          administrador_nome: evento.administrador_nome,
          observacoes: evento.observacoes,
          fotos_compartilhadas: fotosArray as string[],
          dados_especificos: dadosEspecificos,
          hash_evento: evento.hash_evento,
          created_at: evento.created_at
        };
      });

      return eventos;
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Criar evento de manutenção semanal
   */
  const criarEventoManutencao = async (
    loteId: string,
    etapaNumero: number,
    pesoAntes: number,
    latitude?: number,
    longitude?: number,
    administradorId?: string,
    administradorNome?: string,
    observacoes?: string,
    fotosUrls: string[] = [],
    unidadeCodigo?: string
  ) => {
    try {
      const pesoDepois = Math.round(pesoAntes * (1 - 0.0366) * 100) / 100;
      const dataSessao = new Date().toISOString();

      let sessaoId: string | null = null;

      // Se temos informações de sessão, criar/buscar sessão compartilhada
      if (administradorId && administradorNome && unidadeCodigo && etapaNumero > 1) {
        sessaoId = await buscarOuCriarSessao(
          dataSessao,
          administradorId,
          administradorNome,
          unidadeCodigo,
          latitude,
          longitude,
          fotosUrls,
          observacoes
        );
      }

      const { data, error } = await supabase
        .from('lote_eventos')
        .insert({
          lote_id: loteId,
          tipo_evento: 'manutencao',
          etapa_numero: etapaNumero,
          data_evento: dataSessao,
          peso_antes: pesoAntes,
          peso_depois: pesoDepois,
          latitude,
          longitude,
          administrador_id: administradorId,
          administrador_nome: administradorNome || 'Sistema',
          observacoes: sessaoId ? null : observacoes, // Se tem sessão, observação fica na sessão
          fotos_compartilhadas: sessaoId ? [] : fotosUrls, // Se tem sessão, fotos ficam na sessão
          sessao_manutencao_id: sessaoId
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar evento de manutenção:', error);
      return { success: false, error };
    }
  };

  /**
   * Criar evento de finalização
   */
  const criarEventoFinalizacao = async (
    loteId: string,
    pesoAnterior: number,
    pesoFinalReal: number,
    fotosCompartilhadas: string[],
    observacoes: string,
    administradorId: string,
    administradorNome: string,
    latitude?: number,
    longitude?: number
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lote_eventos')
        .insert({
          lote_id: loteId,
          tipo_evento: 'finalizacao',
          etapa_numero: 8,
          peso_antes: pesoAnterior,
          peso_depois: pesoFinalReal,
          caixa_origem: 7,
          caixa_destino: null,
          latitude,
          longitude,
          administrador_id: administradorId,
          administrador_nome: administradorNome,
          observacoes,
          fotos_compartilhadas: fotosCompartilhadas,
          dados_especificos: {
            peso_real: true,
            peso_final_medido: pesoFinalReal,
            reducao_total_percentual: Number((((pesoAnterior - pesoFinalReal) / pesoAnterior) * 100).toFixed(2))
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Lote finalizado com sucesso!'
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar evento de finalização:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o lote',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gerar eventos de manutenção estimados para completar a trilha
   */
  const gerarEventosEstimados = (
    eventosExistentes: LoteEvento[],
    pesoInicial: number
  ): LoteEvento[] => {
    const eventosCompletos: LoteEvento[] = [...eventosExistentes];
    const ultimoEvento = eventosExistentes[eventosExistentes.length - 1];
    const ultimaEtapa = ultimoEvento?.etapa_numero || 1;

    // Se já temos 8 eventos, retornar
    if (eventosExistentes.length >= 8) {
      return eventosCompletos;
    }

    // Calcular peso base para estimativas
    let pesoAtual = ultimoEvento?.peso_depois || pesoInicial;

    // Gerar eventos estimados para completar até 8
    for (let etapa = ultimaEtapa + 1; etapa <= 8; etapa++) {
      const pesoAnterior = pesoAtual;
      const pesoDepois = Number((pesoAtual * (1 - 0.0366)).toFixed(2));

      const eventoEstimado: LoteEvento = {
        id: `estimado-${etapa}`,
        lote_id: ultimoEvento?.lote_id || '',
        tipo_evento: etapa === 8 ? 'finalizacao' : 'manutencao',
        etapa_numero: etapa,
        data_evento: '', // Será calculado na interface
        peso_antes: pesoAnterior,
        peso_depois: pesoDepois,
        caixa_origem: etapa - 1,
        caixa_destino: etapa,
        latitude: null,
        longitude: null,
        administrador_id: null,
        administrador_nome: 'Sistema (Estimado)',
        observacoes: 'Evento ainda não realizado - peso estimado',
        fotos_compartilhadas: [],
        dados_especificos: {
          estimado: true,
          peso_calculado: pesoDepois,
          taxa_decaimento: 0.0366
        },
        hash_evento: null,
        created_at: ''
      };

      eventosCompletos.push(eventoEstimado);
      pesoAtual = pesoDepois;
    }

    return eventosCompletos;
  };

  return {
    loading,
    fetchEventosByLote,
    criarEventoManutencao,
    criarEventoFinalizacao,
    gerarEventosEstimados
  };
};
