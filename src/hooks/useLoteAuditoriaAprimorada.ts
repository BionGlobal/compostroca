import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLoteEventos, LoteEvento } from './useLoteEventos';
import { generateHashRastreabilidade, DadosHashRastreabilidade } from '@/lib/hashUtils';

export interface LoteAuditoriaAprimorada {
  // Dados básicos do lote
  id: string;
  codigo_unico: string;
  codigo: string;
  unidade: string;
  unidade_nome: string;
  status: string;
  
  // Rastreabilidade
  hash_rastreabilidade: string | null;
  hash_integridade: string | null;
  hash_anterior: string | null;
  data_hash_criacao: string | null;
  indice_cadeia: number;
  qr_code_url: string | null;
  
  // Datas
  data_inicio: string;
  data_finalizacao: string | null;
  duracao_processo_dias: number;
  
  // Pesos e impacto
  peso_inicial: number;
  peso_final: number | null;
  peso_atual: number;
  taxa_reducao_esperada: number;
  taxa_reducao_real: number | null;
  co2eq_evitado: number | null;
  creditos_cau: number | null;
  
  // Administrador
  criado_por_nome: string;
  
  // Geolocalização
  latitude: number | null;
  longitude: number | null;
  
  // Trilha de eventos (8 eventos sempre)
  eventos: LoteEvento[];
  eventos_reais_count: number;
  eventos_estimados_count: number;
  
  // Voluntários
  total_voluntarios: number;
  voluntarios_detalhes: Array<{
    id: string;
    nome: string;
    numero_balde: number;
    total_entregas: number;
    peso_total: number;
  }>;
  
  // Validação de integridade
  status_integridade: 'VÁLIDO' | 'ALERTA' | 'CRÍTICO' | 'PENDENTE';
  mensagens_integridade: string[];
  
  // Fotos unificadas
  total_fotos: number;
  fotos_por_tipo: Record<string, number>;
  
  // Médias de sensores consolidadas
  medias_sensores?: {
    media_temperatura_semana2?: number | null;
    media_umidade_semana2?: number | null;
    media_condutividade_semana2?: number | null;
    media_nitrogenio_semana6?: number | null;
    media_fosforo_semana6?: number | null;
    media_potassio_semana6?: number | null;
    media_ph_semana6?: number | null;
    updated_at?: string | null;
  } | null;
}

export const useLoteAuditoriaAprimorada = (codigoUnico: string) => {
  const [loteAuditoria, setLoteAuditoria] = useState<LoteAuditoriaAprimorada | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { fetchEventosByLote, gerarEventosEstimados } = useLoteEventos();

  const fetchLoteAuditoriaAprimorada = async () => {
    if (!codigoUnico) return;

    setLoading(true);
    try {
      // Buscar dados do lote
      const { data: loteData, error: loteError } = await supabase
        .from('lotes')
        .select(`
          *,
          unidades:unidade_id (
            nome,
            codigo_unidade
          ),
          medias_sensores_lote!medias_sensores_lote_lote_id_fkey (
            media_temperatura_semana2,
            media_umidade_semana2,
            media_condutividade_semana2,
            media_nitrogenio_semana6,
            media_fosforo_semana6,
            media_potassio_semana6,
            media_ph_semana6,
            updated_at
          )
        `)
        .eq('codigo_unico', codigoUnico)
        .is('deleted_at', null)
        .single();

      if (loteError) throw loteError;
      if (!loteData) {
        throw new Error('Lote não encontrado');
      }

      // Buscar eventos do lote
      const eventosReais = await fetchEventosByLote(loteData.id);
      
      // Completar com eventos estimados se necessário
      const eventosCompletos = gerarEventosEstimados(eventosReais, loteData.peso_inicial || 0);

      // Buscar voluntários e entregas
      const { data: entregasData } = await supabase
        .from('entregas')
        .select(`
          *,
          voluntarios:voluntario_id (
            id,
            nome,
            numero_balde
          )
        `)
        .eq('lote_codigo', loteData.codigo)
        .is('deleted_at', null);

      // Agregar dados dos voluntários
      const voluntariosMap = new Map();
      (entregasData || []).forEach(entrega => {
        const vol = entrega.voluntarios;
        if (!vol) return;
        
        if (!voluntariosMap.has(vol.id)) {
          voluntariosMap.set(vol.id, {
            id: vol.id,
            nome: vol.nome,
            numero_balde: vol.numero_balde,
            total_entregas: 0,
            peso_total: 0
          });
        }
        
        const volData = voluntariosMap.get(vol.id);
        volData.total_entregas += 1;
        volData.peso_total += entrega.peso || 0;
      });

      // Contar fotos
      const { count: totalFotos } = await supabase
        .from('lote_fotos')
        .select('*', { count: 'exact', head: true })
        .eq('lote_id', loteData.id)
        .is('deleted_at', null);

      // Buscar fotos por tipo
      const { data: fotosPorTipo } = await supabase
        .from('lote_fotos')
        .select('tipo_foto')
        .eq('lote_id', loteData.id)
        .is('deleted_at', null);

      const fotosPorTipoCount: Record<string, number> = {};
      (fotosPorTipo || []).forEach(foto => {
        fotosPorTipoCount[foto.tipo_foto] = (fotosPorTipoCount[foto.tipo_foto] || 0) + 1;
      });

      // Calcular duração do processo
      const dataInicio = new Date(loteData.data_inicio);
      const dataFim = loteData.data_finalizacao 
        ? new Date(loteData.data_finalizacao) 
        : new Date();
      const duracaoDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

      // Calcular taxa de redução
      const taxaReducaoEsperada = 22; // 22% após 7 semanas
      const taxaReducaoReal = loteData.peso_final && loteData.peso_inicial
        ? ((loteData.peso_inicial - loteData.peso_final) / loteData.peso_inicial) * 100
        : null;

      // Validar integridade
      const { status, mensagens } = validarIntegridade(
        loteData,
        eventosCompletos,
        eventosReais.length
      );

      // Gerar hash de rastreabilidade se não existir e o lote estiver encerrado
      let hashRastreabilidade = loteData.hash_rastreabilidade;
      if (!hashRastreabilidade && loteData.status === 'encerrado' && eventosReais.length > 0) {
        hashRastreabilidade = await gerarHashRastreabilidadeParaLote(loteData, entregasData || []);
      }

      const auditoriaData: LoteAuditoriaAprimorada = {
        id: loteData.id,
        codigo_unico: loteData.codigo_unico || loteData.codigo,
        codigo: loteData.codigo,
        unidade: loteData.unidade,
        unidade_nome: loteData.unidades?.nome || loteData.unidade,
        status: loteData.status,
        hash_rastreabilidade: hashRastreabilidade,
        hash_integridade: loteData.hash_integridade,
        hash_anterior: loteData.hash_anterior,
        data_hash_criacao: loteData.data_hash_criacao,
        indice_cadeia: loteData.indice_cadeia || 0,
        qr_code_url: loteData.qr_code_url,
        data_inicio: loteData.data_inicio,
        data_finalizacao: loteData.data_finalizacao,
        duracao_processo_dias: duracaoDias,
        peso_inicial: loteData.peso_inicial || 0,
        peso_final: loteData.peso_final,
        peso_atual: loteData.peso_atual || loteData.peso_inicial || 0,
        taxa_reducao_esperada: taxaReducaoEsperada,
        taxa_reducao_real: taxaReducaoReal,
        co2eq_evitado: loteData.co2eq_evitado,
        creditos_cau: loteData.creditos_cau,
        criado_por_nome: loteData.criado_por_nome,
        latitude: loteData.latitude,
        longitude: loteData.longitude,
        eventos: eventosCompletos,
        eventos_reais_count: eventosReais.length,
        eventos_estimados_count: eventosCompletos.length - eventosReais.length,
        total_voluntarios: voluntariosMap.size,
        voluntarios_detalhes: Array.from(voluntariosMap.values()),
        status_integridade: status,
        mensagens_integridade: mensagens,
        total_fotos: totalFotos || 0,
        fotos_por_tipo: fotosPorTipoCount,
        medias_sensores: loteData.medias_sensores_lote || null
      };

      setLoteAuditoria(auditoriaData);
    } catch (error) {
      console.error('Erro ao buscar auditoria do lote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de auditoria do lote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoteAuditoriaAprimorada();
  }, [codigoUnico]);

  return {
    loteAuditoria,
    loading,
    refetch: fetchLoteAuditoriaAprimorada
  };
};

// Função auxiliar para validar integridade
function validarIntegridade(
  loteData: any,
  eventos: LoteEvento[],
  eventosReaisCount: number
): { status: 'VÁLIDO' | 'ALERTA' | 'CRÍTICO' | 'PENDENTE'; mensagens: string[] } {
  const mensagens: string[] = [];
  let status: 'VÁLIDO' | 'ALERTA' | 'CRÍTICO' | 'PENDENTE' = 'VÁLIDO';

  // Verificar se tem hash de rastreabilidade
  if (!loteData.hash_rastreabilidade && loteData.status === 'encerrado') {
    mensagens.push('Hash de rastreabilidade ausente');
    status = 'ALERTA';
  }

  // Verificar se tem 8 eventos
  if (eventos.length < 8) {
    mensagens.push(`Trilha incompleta: ${eventosReaisCount}/8 eventos registrados`);
    status = 'PENDENTE';
  }

  // Verificar se tem eventos estimados
  if (eventosReaisCount < 8 && loteData.status === 'encerrado') {
    mensagens.push('Lote finalizado com eventos estimados - dados podem não ser precisos');
    if (status === 'VÁLIDO') status = 'ALERTA';
  }

  // Verificar geolocalização
  if (!loteData.latitude || !loteData.longitude) {
    mensagens.push('Geolocalização ausente no evento de início');
    if (status === 'VÁLIDO') status = 'ALERTA';
  }

  // Verificar peso inicial
  if (!loteData.peso_inicial || loteData.peso_inicial <= 0) {
    mensagens.push('Peso inicial inválido ou ausente');
    status = 'CRÍTICO';
  }

  if (mensagens.length === 0) {
    mensagens.push('Todos os dados de rastreabilidade estão completos e válidos');
  }

  return { status, mensagens };
}

// Função auxiliar para gerar hash de rastreabilidade
async function gerarHashRastreabilidadeParaLote(
  loteData: any,
  entregas: any[]
): Promise<string> {
  const pesoTotalResiduos = entregas.reduce((sum, e) => sum + (e.peso || 0), 0);
  const pesoCepilho = pesoTotalResiduos * 0.35;

  const dadosHash: DadosHashRastreabilidade = {
    lote_id: loteData.id,
    codigo_unico: loteData.codigo_unico || loteData.codigo,
    timestamp_criacao: loteData.data_inicio,
    unidade_codigo: loteData.unidade,
    geolocation: {
      latitude: loteData.latitude,
      longitude: loteData.longitude
    },
    peso_total_residuos: pesoTotalResiduos,
    peso_cepilho: pesoCepilho,
    peso_inicial_total: loteData.peso_inicial || 0,
    voluntarios: entregas.map(e => ({
      id: e.voluntario_id,
      nome: e.voluntarios?.nome || 'Desconhecido',
      numero_balde: e.voluntarios?.numero_balde || 0,
      peso_entrega: e.peso || 0
    })),
    administrador_validador: loteData.criado_por_nome,
    total_entregas: entregas.length,
    assinatura_digital: `${loteData.data_inicio}-${loteData.codigo_unico || loteData.codigo}`
  };

  const hash = generateHashRastreabilidade(dadosHash);

  // Atualizar no banco de dados
  await supabase
    .from('lotes')
    .update({
      hash_rastreabilidade: hash,
      data_hash_criacao: new Date().toISOString()
    })
    .eq('id', loteData.id);

  return hash;
}
