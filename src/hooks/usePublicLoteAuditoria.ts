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
  fotos_entrega: string[];
  fotos_manejo: string[];
  comentario: string;
  nota_contexto: string;
  lote_id: string;
  manejo_id?: string | null;
}

interface LoteAuditoriaData {
  // Cabeçalho
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
  if (url.includes('entrega-fotos/') || url.includes('lote-fotos/')) {
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

        // 1. Buscar lote e unidade (aceita lotes em produção e certificados)
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
            created_at,
            voluntarios:voluntario_id (
              nome,
              numero_balde
            )
          `)
          .eq('lote_codigo', lote.codigo)
          .is('deleted_at', null);

        if (entregasError) throw entregasError;

        // 4. Buscar fotos das entregas
        const entregaIds = entregas?.map(e => e.id) || [];
        const { data: fotosEntregas } = await supabase
          .from('entrega_fotos')
          .select('foto_url, entrega_id')
          .in('entrega_id', entregaIds)
          .is('deleted_at', null);

        // 5. Buscar dados de manutenções via sessao_manutencao_id
        const eventosManutencao = eventos?.filter(e => 
          (e.tipo_evento === 'manutencao' || e.tipo_evento === 'finalizacao') && 
          e.sessao_manutencao_id
        ) || [];
        
        const sessaoIds = [...new Set(eventosManutencao.map(e => e.sessao_manutencao_id).filter(Boolean))];

        let sessoesMap = new Map();
        if (sessaoIds.length > 0) {
          const { data: sessoes } = await supabase
            .from('sessoes_manutencao')
            .select('*')
            .in('id', sessaoIds);
          
          if (sessoes) {
            sessoes.forEach(s => sessoesMap.set(s.id, s));
          }
        }

        // 6. Processar voluntários
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

        // 7. Processar eventos da timeline
        const eventosProcessados: Evento[] = [];
        const validadoresSet = new Set<string>();

        console.log(`[Lote ${codigoUnico}] Processando ${eventos?.length || 0} eventos`);

        eventos?.forEach((evento) => {
          const data = new Date(evento.data_evento);
          const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          let tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO' = 'MANUTENCAO';
          let fotosEntrega: string[] = [];
          let fotosManejo: string[] = [];
          let validadorNome = '-';
          let comentario = '';
          let notaContexto = '';

          const isEstimado = evento.dados_especificos && typeof evento.dados_especificos === 'object' && 'estimado' in evento.dados_especificos;

          if (evento.tipo_evento === 'inicio') {
            tipo = 'INICIO';
            validadorNome = evento.administrador_nome || '-';
            
            // PRIORIDADE FOTOS INÍCIO: 1º evento.fotos_compartilhadas, 2º entrega_fotos
            const fotos = evento.fotos_compartilhadas as string[] | null;
            if (fotos && Array.isArray(fotos) && fotos.length > 0) {
              fotosEntrega = fotos.map(processPhotoUrl);
              console.log(`[Etapa ${evento.etapa_numero}] ${fotos.length} fotos do evento (fotos_compartilhadas)`);
            } else {
              fotosEntrega = fotosEntregas?.map(f => processPhotoUrl(f.foto_url)).filter(Boolean) || [];
              console.log(`[Etapa ${evento.etapa_numero}] ${fotosEntrega.length} fotos das entregas`);
            }
            
            if (evento.dados_especificos) {
              const dados = evento.dados_especificos as Record<string, any>;
              const totalVol = dados.total_voluntarios || 0;
              const pesoRes = Math.round((dados.peso_residuos || 0) * 100) / 100;
              const pesoCep = Math.round((dados.peso_cepilho || 0) * 100) / 100;
              comentario = `${totalVol} voluntários • ${pesoRes} kg resíduos + ${pesoCep} kg cepilho`;
            }
            
          } else if (evento.tipo_evento === 'finalizacao' || evento.etapa_numero === 8) {
            tipo = 'FINALIZACAO';
            validadorNome = evento.administrador_nome || '-';
            
            // PRIORIDADE FOTOS FINALIZAÇÃO: 1º evento.fotos_compartilhadas, 2º sessao.fotos_gerais
            const fotos = evento.fotos_compartilhadas as string[] | null;
            if (fotos && Array.isArray(fotos) && fotos.length > 0) {
              fotosManejo = fotos.map(processPhotoUrl);
              console.log(`[Etapa ${evento.etapa_numero}] ${fotos.length} fotos do evento (fotos_compartilhadas)`);
            } else if (evento.sessao_manutencao_id) {
              const sessaoData = sessoesMap.get(evento.sessao_manutencao_id);
              const fotosSessao = sessaoData?.fotos_gerais as string[] | null;
              if (fotosSessao && Array.isArray(fotosSessao) && fotosSessao.length > 0) {
                fotosManejo = fotosSessao.map(processPhotoUrl);
                console.log(`[Etapa ${evento.etapa_numero}] ${fotosSessao.length} fotos da sessão (fotos_gerais)`);
              } else {
                console.log(`[Etapa ${evento.etapa_numero}] Sessão encontrada mas sem fotos`);
              }
            } else {
              console.log(`[Etapa ${evento.etapa_numero}] Sem sessão associada`);
            }
            
            if (evento.sessao_manutencao_id) {
              const sessaoData = sessoesMap.get(evento.sessao_manutencao_id);
              comentario = sessaoData?.observacoes_gerais || evento.observacoes || '';
              validadorNome = sessaoData?.administrador_nome || validadorNome;
            } else {
              comentario = evento.observacoes || '';
            }
            
          } else {
            tipo = 'MANUTENCAO';
            
            // PRIORIDADE FOTOS MANUTENÇÃO: 1º evento.fotos_compartilhadas, 2º sessao.fotos_gerais
            const fotos = evento.fotos_compartilhadas as string[] | null;
            if (fotos && Array.isArray(fotos) && fotos.length > 0) {
              fotosManejo = fotos.map(processPhotoUrl);
              console.log(`[Etapa ${evento.etapa_numero}] ${fotos.length} fotos do evento (fotos_compartilhadas)`);
            } else if (evento.sessao_manutencao_id) {
              const sessaoData = sessoesMap.get(evento.sessao_manutencao_id);
              const fotosSessao = sessaoData?.fotos_gerais as string[] | null;
              if (fotosSessao && Array.isArray(fotosSessao) && fotosSessao.length > 0) {
                fotosManejo = fotosSessao.map(processPhotoUrl);
                console.log(`[Etapa ${evento.etapa_numero}] ${fotosSessao.length} fotos da sessão (fotos_gerais)`);
              } else {
                console.log(`[Etapa ${evento.etapa_numero}] Sessão encontrada mas sem fotos`);
              }
            } else {
              console.log(`[Etapa ${evento.etapa_numero}] Sem sessão associada`);
            }
            
            if (evento.sessao_manutencao_id) {
              const sessaoData = sessoesMap.get(evento.sessao_manutencao_id);
              validadorNome = sessaoData?.administrador_nome || evento.administrador_nome || 'Sistema';
              comentario = sessaoData?.observacoes_gerais || evento.observacoes || '';
            } else {
              validadorNome = evento.administrador_nome || 'Sistema (Estimado)';
              comentario = evento.observacoes || '';
            }
            
            if (isEstimado) {
              notaContexto = '⚠️ Evento estimado - sem registro fotográfico';
            }
          }

          if (validadorNome !== '-' && !validadorNome.includes('Estimado')) {
            validadoresSet.add(validadorNome);
          }

          // Peso: usar peso_depois do evento ou calcular
          const pesoCalculado = evento.etapa_numero === 1
            ? lote.peso_inicial
            : (evento.peso_depois ?? calcularPesoSemanal(lote.peso_inicial, evento.etapa_numero - 1));

          eventosProcessados.push({
            etapa: evento.etapa_numero,
            tipo,
            data,
            hora,
            validador: validadorNome,
            peso_calculado: pesoCalculado,
            fotos_entrega: fotosEntrega,
            fotos_manejo: fotosManejo,
            comentario,
            nota_contexto: notaContexto,
            lote_id: lote.id,
            manejo_id: evento.sessao_manutencao_id || null
          });
        });

        console.log(`[Lote ${codigoUnico}] Resumo:`, {
          total_eventos: eventosProcessados.length,
          tem_etapa_1: eventosProcessados.some(e => e.etapa === 1),
          eventos_com_fotos_entrega: eventosProcessados.filter(e => e.fotos_entrega.length > 0).length,
          eventos_com_fotos_manejo: eventosProcessados.filter(e => e.fotos_manejo.length > 0).length,
          total_validadores: validadoresSet.size
        });

        // 8. Determinar status do lote
        const statusLote = lote.status === 'encerrado' && lote.data_finalizacao 
          ? 'certificado' 
          : 'em_producao';

        // 9. Calcular métricas (condicionais para lotes em produção)
        const dataFim = lote.data_finalizacao || lote.data_encerramento || new Date().toISOString();
        const duracaoDias = Math.ceil(
          (new Date(dataFim).getTime() - new Date(lote.data_inicio).getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        const pesoFinal = statusLote === 'certificado' 
          ? (lote.peso_final || calcularPesoSemanal(lote.peso_inicial, 7))
          : calcularPesoSemanal(lote.peso_inicial, eventos?.length || 1);
        
        // Sempre calcular CO2 e CAU (estimado ou final)
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
          peso_inicial: lote.peso_inicial,
          peso_final: pesoFinal,
          duracao_dias: duracaoDias,
          co2eq_evitado: co2eqEvitado,
          creditos_cau: creditosCau,
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