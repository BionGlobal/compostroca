import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Voluntario {
  iniciais: string;
  numero_balde: number;
  peso: number;
  rating: number;
}

interface Evento {
  etapa: number;
  tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO';
  data: Date;
  hora: string;
  validador: string;
  peso_calculado: number;
  fotos: string[];
  comentario: string;
  nota_contexto: string;
}

interface LoteAuditoriaData {
  // Cabeçalho
  codigo_lote: string;
  codigo_unico: string;
  unidade: {
    nome: string;
    codigo: string;
    localizacao: string;
  };
  data_inicio: Date;
  data_finalizacao: Date | null;
  hash_rastreabilidade: string;
  
  // Métricas
  peso_inicial: number;
  peso_final: number;
  duracao_dias: number;
  co2eq_evitado: number;
  creditos_cau: number;
  
  // Voluntários
  voluntarios: Voluntario[];
  total_voluntarios: number;
  media_rating: number;
  
  // Timeline
  eventos: Evento[];
  
  // Validadores
  validadores: string[];
}

const BUCKET_URL = 'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public';

const processPhotoUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  // Se a URL já tem o bucket no caminho, retorna como está
  if (url.includes('entrega-fotos/') || url.includes('lote-fotos/')) {
    return `${BUCKET_URL}/${url}`;
  }
  // Caso contrário, assume que é do bucket entrega-fotos
  return `${BUCKET_URL}/entrega-fotos/${url}`;
};

const calcularPesoSemanal = (pesoInicial: number, semana: number): number => {
  // Taxa de decaimento: 3,65% por semana = fator 0,9635
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

        // 1. Buscar lote e unidade
        const { data: lote, error: loteError } = await supabase
          .from('lotes')
          .select(`
            id,
            codigo,
            codigo_unico,
            unidade,
            peso_inicial,
            peso_final,
            data_inicio,
            data_finalizacao,
            data_encerramento,
            hash_integridade,
            unidades:unidade_id (
              nome,
              codigo_unidade,
              localizacao
            )
          `)
          .eq('codigo_unico', codigoUnico)
          .is('deleted_at', null)
          .single();

        if (loteError || !lote) {
          throw new Error('Lote não encontrado');
        }

        // 2. Buscar eventos
        const { data: eventos, error: eventosError } = await supabase
          .from('lote_eventos')
          .select('*')
          .eq('lote_id', lote.id)
          .is('deleted_at', null)
          .order('etapa_numero', { ascending: true });

        if (eventosError) throw eventosError;

        // 3. Buscar entregas e voluntários
        const { data: entregas, error: entregasError } = await supabase
          .from('entregas')
          .select(`
            id,
            peso,
            qualidade_residuo,
            voluntarios:voluntario_id (
              nome,
              numero_balde
            )
          `)
          .eq('lote_codigo', lote.codigo)
          .is('deleted_at', null);

        if (entregasError) throw entregasError;

        // 4. Processar voluntários
        const voluntariosMap = new Map<number, Voluntario>();
        let somaRatings = 0;
        let countRatings = 0;

        entregas?.forEach(entrega => {
          const vol = entrega.voluntarios;
          if (vol && vol.numero_balde) {
            const existing = voluntariosMap.get(vol.numero_balde);
            if (existing) {
              existing.peso += entrega.peso;
            } else {
              voluntariosMap.set(vol.numero_balde, {
                iniciais: getIniciais(vol.nome || ''),
                numero_balde: vol.numero_balde,
                peso: entrega.peso,
                rating: entrega.qualidade_residuo || 0
              });
            }
          }
          if (entrega.qualidade_residuo) {
            somaRatings += entrega.qualidade_residuo;
            countRatings++;
          }
        });

        const voluntarios = Array.from(voluntariosMap.values()).sort(
          (a, b) => a.numero_balde - b.numero_balde
        );

        // 5. Processar eventos da timeline
        const eventosProcessados: Evento[] = [];
        const validadoresSet = new Set<string>();

        eventos?.forEach((evento, index) => {
          const fotos = Array.isArray(evento.fotos_compartilhadas)
            ? evento.fotos_compartilhadas.map(processPhotoUrl).filter(url => url)
            : [];

          const data = new Date(evento.data_evento);
          const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          let tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO' = 'MANUTENCAO';
          let notaContexto = 'Registro fotográfico do processo geral de manutenção da esteira, compartilhado com todos os lotes ativos nesta data.';

          if (evento.tipo_evento === 'inicio') {
            tipo = 'INICIO';
            notaContexto = 'Fotos exclusivas das entregas que deram origem a este lote.';
          } else if (evento.tipo_evento === 'finalizacao' || index === eventos.length - 1) {
            tipo = 'FINALIZACAO';
          }

          if (evento.administrador_nome) {
            validadoresSet.add(evento.administrador_nome);
          }

          // Calcular peso para a etapa
          const pesoCalculado = calcularPesoSemanal(lote.peso_inicial, evento.etapa_numero - 1);

          eventosProcessados.push({
            etapa: evento.etapa_numero,
            tipo,
            data,
            hora,
            validador: evento.administrador_nome || 'Sistema',
            peso_calculado: pesoCalculado,
            fotos,
            comentario: evento.observacoes || '',
            nota_contexto: notaContexto
          });
        });

        // 6. Calcular métricas
        const pesoFinal = lote.peso_final || calcularPesoSemanal(lote.peso_inicial, 7);
        const dataFim = lote.data_finalizacao || lote.data_encerramento;
        const duracaoDias = dataFim
          ? Math.ceil((new Date(dataFim).getTime() - new Date(lote.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const resultado: LoteAuditoriaData = {
          codigo_lote: lote.codigo,
          codigo_unico: lote.codigo_unico,
          unidade: {
            nome: lote.unidades?.nome || 'Não disponível',
            codigo: lote.unidades?.codigo_unidade || lote.unidade,
            localizacao: lote.unidades?.localizacao || 'Não disponível'
          },
          data_inicio: new Date(lote.data_inicio),
          data_finalizacao: dataFim ? new Date(dataFim) : null,
          hash_rastreabilidade: lote.hash_integridade || '',
          peso_inicial: lote.peso_inicial,
          peso_final: pesoFinal,
          duracao_dias: duracaoDias,
          co2eq_evitado: Math.round(pesoFinal * 0.766 * 100) / 100,
          creditos_cau: Math.round((pesoFinal / 1000) * 1000) / 1000,
          voluntarios,
          total_voluntarios: voluntarios.length,
          media_rating: countRatings > 0 ? Math.round((somaRatings / countRatings) * 10) / 10 : 0,
          eventos: eventosProcessados,
          validadores: Array.from(validadoresSet)
        };

        setData(resultado);
      } catch (err) {
        console.error('Erro ao buscar dados da auditoria:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [codigoUnico]);

  return { data, loading, error };
};
