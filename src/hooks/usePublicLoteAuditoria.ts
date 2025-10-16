import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Voluntario {
  iniciais: string;
  numero_balde: number;
  peso: number;
  rating: number;
}

interface Evento {
  semana: number; // 0-7
  tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO';
  data: Date;
  hora: string;
  validador: string;
  peso_calculado: number | null;
  fotos: string[];
  comentario: string;
  nota_contexto: string;
  lote_id: string;
}

interface LoteAuditoriaData {
  codigo_lote: string;
  codigo_unico: string;
  status_lote: 'em_producao' | 'certificado';
  unidade: {
    nome: string;
    codigo: string;
    localizacao: string;
  };
  data_inicio: Date;
  data_finalizacao: Date | null;
  hash_rastreabilidade: string;
  latitude: number | null;
  longitude: number | null;

  peso_inicial: number;
  peso_final: number;
  duracao_dias: number;
  co2eq_evitado: number;
  creditos_cau: number;

  voluntarios: Voluntario[];
  total_voluntarios: number;
  media_rating: number;

  eventos: Evento[];
  validadores: string[];
}

const BUCKET_URL = 'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public';

const processPhotoUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.includes('entrega-fotos/') || url.includes('lote-fotos/') || url.includes('manejo-fotos/')) {
    return `${BUCKET_URL}/${url}`;
  }
  return `${BUCKET_URL}/entrega-fotos/${url}`;
};

const calcularPesoSemanal = (pesoInicial: number, semana: number): number => {
  const fatorDecaimento = 0.9635;
  return Math.round(pesoInicial * Math.pow(fatorDecaimento, semana) * 100) / 100;
};

const getIniciais = (nome: string): string => {
  if (!nome) return 'N/A';
  const palavras = nome.trim().split(' ').filter(p => p.length > 0);
  if (palavras.length === 0) return 'N/A';
  if (palavras.length === 1) return palavras[0].substring(0, 2).toUpperCase();
  return `${palavras[0][0]}${palavras[palavras.length - 1][0]}`.toUpperCase();
};

export const usePublicLoteAuditoria = (codigoUnico: string | undefined) => {
  const [data, setData] = useState<LoteAuditoriaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigoUnico) {
      setError('Código único não fornecido');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Lote + Unidade
        const { data: lote, error: loteError } = await supabase
          .from('lotes')
          .select(`
            id,
            codigo,
            codigo_unico,
            status,
            unidade,
            peso_inicial,
            peso_final,
            data_inicio,
            data_finalizacao,
            data_encerramento,
            hash_integridade,
            latitude,
            longitude,
            unidades:unidade_id (
              nome,
              codigo_unidade,
              localizacao
            )
          `)
          .eq('codigo_unico', codigoUnico)
          .in('status', ['em_processamento', 'encerrado'])
          .is('deleted_at', null)
          .maybeSingle();

        if (loteError || !lote) {
          throw new Error('Lote não encontrado');
        }

        // 2) Evento de início (Semana 0)
        const { data: eventoInicio } = await supabase
          .from('lote_eventos')
          .select('*')
          .eq('lote_id', lote.id)
          .eq('tipo_evento', 'inicio')
          .is('deleted_at', null)
          .maybeSingle();

        // 3) Entregas/voluntários para Semana 0
        const { data: entregas } = await supabase
          .from('entregas')
          .select(`
            id,
            peso,
            qualidade_residuo,
            created_at,
            voluntarios:voluntario_id (
              nome,
              numero_balde
            )
          `)
          .eq('lote_codigo', lote.codigo)
          .is('deleted_at', null);

        const entregaIds = entregas?.map(e => e.id) || [];
        let fotosEntregas: string[] = [];

        if (entregaIds.length > 0) {
          const { data: fotosData } = await supabase
            .from('entrega_fotos')
            .select('foto_url')
            .in('entrega_id', entregaIds)
            .is('deleted_at', null);

          fotosEntregas = fotosData?.map(f => processPhotoUrl(f.foto_url)).filter(Boolean) || [];
        }

        if (eventoInicio?.fotos_compartilhadas) {
          const fotosEvento = eventoInicio.fotos_compartilhadas as string[] | null;
          if (Array.isArray(fotosEvento) && fotosEvento.length > 0) {
            fotosEntregas = fotosEvento.map(processPhotoUrl);
          }
        }

        // 4) Manutenções (Semanas 1..7): JOIN lotes_manutencoes + manutencoes_semanais
        const { data: manutencoes, error: manutencoesError } = await supabase
          .from('lotes_manutencoes')
          .select(`
            semana_processo,
            peso_antes,
            peso_depois,
            caixa_origem,
            caixa_destino,
            created_at,
            manutencoes_semanais:manutencao_id (
              id,
              data_ocorrencia,
              comentario,
              fotos_urls,
              validador_nome,
              latitude,
              longitude
            )
          `)
          .eq('lote_id', lote.id)
          .is('deleted_at', null)
          .order('semana_processo', { ascending: true });

        if (manutencoesError) throw manutencoesError;

        // 5) Processar voluntários
        const voluntariosMap = new Map<number, Voluntario>();
        let somaRatings = 0;
        let countRatings = 0;

        entregas?.forEach(entrega => {
          const vol = entrega.voluntarios;
          if (vol?.numero_balde) {
            const existing = voluntariosMap.get(vol.numero_balde);
            if (existing) existing.peso += entrega.peso;
            else voluntariosMap.set(vol.numero_balde, {
              iniciais: getIniciais(vol.nome || ''),
              numero_balde: vol.numero_balde,
              peso: entrega.peso,
              rating: entrega.qualidade_residuo || 0
            });
          }
          if (entrega.qualidade_residuo) {
            somaRatings += entrega.qualidade_residuo;
            countRatings++;
          }
        });

        const voluntarios = Array.from(voluntariosMap.values()).sort(
          (a, b) => a.numero_balde - b.numero_balde
        );

        // 6) Construir timeline
        const eventos: Evento[] = [];
        const validadores = new Set<string>();

        // Semana 0
        if (eventoInicio) {
          const dataEvt = new Date(eventoInicio.data_evento);
          const validador = eventoInicio.administrador_nome || 'Sistema';
          validadores.add(validador);

          let comentario = '';
          if (eventoInicio.dados_especificos) {
            const dados = eventoInicio.dados_especificos as Record<string, any>;
            const totalVol = dados.total_voluntarios || 0;
            const pesoRes = Math.round((dados.peso_residuos || 0) * 100) / 100;
            const pesoCep = Math.round((dados.peso_cepilho || 0) * 100) / 100;
            comentario = `${totalVol} voluntários • ${pesoRes} kg resíduos + ${pesoCep} kg cepilho`;
          }

          eventos.push({
            semana: 0,
            tipo: 'INICIO',
            data: dataEvt,
            hora: dataEvt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            validador,
            peso_calculado: lote.peso_inicial ?? null,
            fotos: fotosEntregas,
            comentario,
            nota_contexto: '',
            lote_id: lote.id
          });
        }

        // Semanas 1..7
        manutencoes?.forEach((lm) => {
          const m = lm.manutencoes_semanais;
          if (!m) return;
          
          // CORREÇÃO FINAL: A data do registro de manutenção é a fonte primária.
          const dataRef = new Date(m.data_ocorrencia || lm.created_at);
          const validador = m.validador_nome || 'Sistema';
          validadores.add(validador);

          const tipo: 'MANUTENCAO' | 'FINALIZACAO' = lm.semana_processo === 7 ? 'FINALIZACAO' : 'MANUTENCAO';
          const fotos = (m.fotos_urls || []).map(processPhotoUrl).filter(Boolean);

          eventos.push({
            semana: lm.semana_processo,
            tipo,
            data: dataRef,
            hora: dataRef.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            validador,
            peso_calculado: lm.peso_depois ?? null,
            fotos,
            comentario: m.comentario || '',
            nota_contexto: '',
            lote_id: lote.id
          });
        });

        eventos.sort((a, b) => a.semana - b.semana);

        // 7) Métricas
        const statusLote = lote.status === 'encerrado' && lote.data_finalizacao ? 'certificado' : 'em_producao';
        const dataFim = lote.data_finalizacao || lote.data_encerramento || new Date().toISOString();
        const duracaoDias = Math.ceil(
          (new Date(dataFim).getTime() - new Date(lote.data_inicio).getTime()) / (1000 * 60 * 60 * 24)
        );

        const pesoFinal = statusLote === 'certificado'
          ? (lote.peso_final || calcularPesoSemanal(lote.peso_inicial, 7))
          : calcularPesoSemanal(lote.peso_inicial, Math.max(0, eventos.length - 1));

        const co2eqEvitado = Math.round(pesoFinal * 0.766 * 100) / 100;
        const creditosCau = Math.round((pesoFinal / 1000) * 1000) / 1000;

        const resultado: LoteAuditoriaData = {
          codigo_lote: lote.codigo,
          codigo_unico: lote.codigo_unico,
          status_lote: statusLote,
          unidade: {
            nome: lote.unidades?.nome || 'Não disponível',
            codigo: lote.unidades?.codigo_unidade || lote.unidade,
            localizacao: lote.unidades?.localizacao || 'Não disponível'
          },
          data_inicio: new Date(lote.data_inicio),
          data_finalizacao: lote.data_finalizacao ? new Date(lote.data_finalizacao) : null,
          hash_rastreabilidade: lote.hash_integridade || '',
          latitude: lote.latitude,
          longitude: lote.longitude,
          peso_inicial: Number(lote.peso_inicial || 0),
          peso_final: Number(pesoFinal || 0),
          duracao_dias: duracaoDias,
          co2eq_evitado: co2eqEvitado,
          creditos_cau: creditosCau,
          voluntarios,
          total_voluntarios: voluntarios.length,
          media_rating: countRatings > 0 ? Math.round((somaRatings / countRatings) * 10) / 10 : 0,
          eventos,
          validadores: Array.from(validadores)
        };

        setData(resultado);
      } catch (err) {
        console.error('[Auditoria] Erro:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [codigoUnico]);

  return { data, loading, error };
};
