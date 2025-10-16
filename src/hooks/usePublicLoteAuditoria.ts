// Caminho do arquivo: src/hooks/usePublicLoteAuditoria.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mantenha as interfaces existentes (Voluntario, Evento, LoteAuditoriaData)
interface Voluntario {
  iniciais: string;
  numero_balde: number;
  peso: number;
  rating: number;
}

interface Evento {
  semana: number;
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
  // Constrói a URL completa para fotos armazenadas no Supabase Storage
  return `${BUCKET_URL}/${url}`;
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

  const fetchData = useCallback(async () => {
    if (!codigoUnico) {
      setError('Código único não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Busca o Lote e sua Unidade
      const { data: lote, error: loteError } = await supabase
        .from('lotes')
        .select(`*, unidades:unidade_id (*)`)
        .eq('codigo_unico', codigoUnico)
        .maybeSingle();

      if (loteError || !lote) throw new Error('Lote não encontrado');

      const eventos: Evento[] = [];
      const validadores = new Set<string>();
      const dataInicioLote = new Date(lote.data_inicio);

      // 2. Busca TODOS os eventos do lote diretamente da "fonte da verdade"
      const { data: todosOsEventos, error: eventosError } = await supabase
        .from('lote_eventos')
        .select('*')
        .eq('lote_id', lote.id)
        .order('etapa_numero', { ascending: true });

      if (eventosError) throw new Error('Falha ao buscar o histórico de eventos do lote.');
      if (!todosOsEventos) throw new Error('Nenhum evento encontrado para este lote.');

      // 3. Processa cada evento para construir a timeline
      for (const evento of todosOsEventos) {
        if (evento.tipo_evento === 'inicio') {
          // Processa a Semana 0
          const { data: entregas } = await supabase.from('entregas').select('id').eq('lote_codigo', lote.codigo);
          const entregaIds = entregas?.map(e => e.id) || [];
          let fotosEntregas: string[] = [];
          if (entregaIds.length > 0) {
            const { data: fotosData } = await supabase.from('entrega_fotos').select('foto_url').in('entrega_id', entregaIds);
            fotosEntregas = fotosData?.map(f => processPhotoUrl(f.foto_url)) || [];
          }

          const validador = evento.administrador_nome || 'Sistema';
          validadores.add(validador);
          eventos.push({
            semana: 0,
            tipo: 'INICIO',
            data: new Date(evento.data_evento),
            hora: new Date(evento.data_evento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            validador,
            peso_calculado: lote.peso_inicial ?? null,
            fotos: fotosEntregas,
            comentario: `Lote iniciado com ${lote.peso_inicial} kg.`,
            nota_contexto: '',
            lote_id: lote.id,
          });
        } else if (evento.tipo_evento === 'manutencao' || evento.tipo_evento === 'finalizacao') {
          // Processa as Semanas 1 a 7
          const semana = evento.etapa_numero - 1;
          const validador = evento.administrador_nome || 'Não Registrado';
          validadores.add(validador);
          
          let fotos: string[] = [];
          if(evento.fotos_compartilhadas) {
             try {
                // O campo é um JSONB, então precisa ser parseado
                const parsedFotos = evento.fotos_compartilhadas as any;
                if(Array.isArray(parsedFotos)) {
                    fotos = parsedFotos.map(processPhotoUrl);
                }
             } catch(e) {
                console.error("Erro ao parsear fotos_compartilhadas", e);
             }
          }

          eventos.push({
            semana: semana,
            tipo: evento.tipo_evento === 'finalizacao' ? 'FINALIZACAO' : 'MANUTENCAO',
            data: new Date(evento.data_evento),
            hora: new Date(evento.data_evento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            validador: validador,
            peso_calculado: evento.peso_depois ?? null,
            fotos: fotos,
            comentario: evento.observacoes || 'Manutenção semanal realizada.',
            nota_contexto: '',
            lote_id: lote.id,
          });
        }
      }
      
      // 4. Processa Voluntários
      const { data: entregasVoluntarios } = await supabase.from('entregas').select(`*, voluntarios:voluntario_id (*)`).eq('lote_codigo', lote.codigo);
      const voluntariosMap = new Map<number, Voluntario>();
      entregasVoluntarios?.forEach(entrega => {
        const vol = (entrega as any).voluntarios as any;
        if (vol?.numero_balde) {
            voluntariosMap.set(vol.numero_balde, {
            iniciais: getIniciais(vol.nome || ''),
            numero_balde: vol.numero_balde,
            peso: (voluntariosMap.get(vol.numero_balde)?.peso || 0) + (entrega as any).peso,
            rating: (entrega as any).qualidade_residuo || 0
          });
        }
      });
      const voluntarios = Array.from(voluntariosMap.values());

      // 5. Monta o objeto final de dados
      const resultado: LoteAuditoriaData = {
        codigo_lote: lote.codigo,
        codigo_unico: lote.codigo_unico,
        status_lote: lote.status === 'encerrado' ? 'certificado' : 'em_producao',
        unidade: {
          nome: (lote.unidades as any)?.nome || '',
          codigo: (lote.unidades as any)?.codigo_unidade || '',
          localizacao: (lote.unidades as any)?.localizacao || '',
        },
        data_inicio: dataInicioLote,
        data_finalizacao: lote.data_finalizacao ? new Date(lote.data_finalizacao) : null,
        hash_rastreabilidade: lote.hash_integridade || '',
        latitude: lote.latitude,
        longitude: lote.longitude,
        peso_inicial: Number(lote.peso_inicial || 0),
        peso_final: Number(lote.peso_final || 0),
        duracao_dias: lote.data_finalizacao ? Math.ceil((new Date(lote.data_finalizacao).getTime() - dataInicioLote.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        co2eq_evitado: Number(lote.peso_final || 0) * 0.766,
        creditos_cau: Number(lote.peso_final || 0) / 1000,
        voluntarios,
        total_voluntarios: voluntarios.length,
        media_rating: 0,
        eventos: eventos.sort((a, b) => a.semana - b.semana),
        validadores: Array.from(validadores),
      };

      setData(resultado);

    } catch (err: any) {
      console.error('[Auditoria] Erro fatal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [codigoUnico]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
};

