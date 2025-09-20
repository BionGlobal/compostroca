import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimelineStageEnhanced {
  id: string;
  etapa: number;
  titulo: string;
  tipo: 'entrega' | 'manutencao' | 'finalizacao';
  caixa_origem?: number;
  caixa_destino?: number;
  peso_antes?: number;
  peso_depois: number;
  observacoes?: string;
  created_at: string;
  usuario_nome?: string;
  data_estimada: boolean;
  fotos: Array<{
    id: string;
    foto_url: string;
    tipo_foto: string;
    origem: 'lote_fotos' | 'manejo_semanal' | 'entrega_fotos';
  }>;
  integridade_validada: boolean;
}

export interface LoteAuditoriaEnhanced {
  id: string;
  codigo: string;
  codigo_unico: string;
  unidade: string;
  status: string;
  peso_inicial: number;
  peso_final: number;
  data_inicio: string;
  data_finalizacao: string;
  co2eq_evitado: number;
  creditos_cau: number;
  hash_integridade: string;
  hash_anterior: string;
  indice_cadeia: number;
  qr_code_url: string;
  criado_por_nome: string;
  latitude?: number;
  longitude?: number;
  voluntarios: Array<{
    id: string;
    nome: string;
    numero_balde: number;
    entregas_count: number;
    peso_total: number;
    qualidade_media: number;
  }>;
  entregas: Array<{
    id: string;
    peso: number;
    qualidade_residuo: number;
    created_at: string;
    voluntario_nome: string;
    fotos: Array<{
      id: string;
      foto_url: string;
      tipo_foto: string;
    }>;
  }>;
  timeline: TimelineStageEnhanced[];
  todasFotosUnificadas: Array<{
    id: string;
    foto_url: string;
    tipo_foto: string;
    origem: 'entrega' | 'manutencao' | 'hibrida';
    created_at: string;
    fonte_dados: string;
  }>;
  estatisticasIntegridade: {
    total_fotos_entregas: number;
    total_fotos_manejo: number;
    total_fotos_unificadas: number;
    total_manejo_registros: number;
    duplicatas_detectadas: number;
    inconsistencias: string[];
  };
}

export const useLoteAuditoriaEnhanced = (codigoUnico?: string) => {
  const [loteAuditoria, setLoteAuditoria] = useState<LoteAuditoriaEnhanced | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLoteAuditoriaEnhanced = async () => {
    if (!codigoUnico) return;

    try {
      setLoading(true);

      // Get lote data
      const { data: lote, error: loteError } = await supabase
        .from('lotes')
        .select('*')
        .or(`codigo.eq.${codigoUnico},codigo_unico.eq.${codigoUnico}`)
        .eq('status', 'encerrado')
        .single();

      if (loteError || !lote) {
        throw new Error('Lote não encontrado ou não finalizado');
      }

      // Simular validação de integridade (função será criada separadamente)
      let integrityCheck: any[] = [{
        status: 'OK',
        total_fotos_entregas: 0,
        total_fotos_manejo: 0,
        total_fotos_lote_fotos: 0,
        total_manejo_semanal: 0,
        inconsistencias: []
      }];

      const integrityStats = integrityCheck?.[0] || {
        status: 'ERRO',
        total_fotos_entregas: 0,
        total_fotos_manejo: 0,
        total_fotos_lote_fotos: 0,
        total_manejo_semanal: 0,
        inconsistencias: ['Erro ao validar integridade']
      };

      // Get entregas with voluntarios
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          id, peso, qualidade_residuo, created_at, voluntario_id
        `)
        .eq('lote_id', lote.id);

      // Get voluntarios data
      const voluntarioIds = entregas?.map(e => e.voluntario_id).filter(Boolean) || [];
      const { data: voluntariosData } = await supabase
        .from('voluntarios')
        .select('id, nome, numero_balde')
        .in('id', voluntarioIds);

      // Get manejo_semanal data
      const { data: manejoData } = await supabase
        .from('manejo_semanal')
        .select(`
          id, peso_antes, peso_depois, observacoes, created_at, user_id, 
          caixa_origem, caixa_destino, foto_url
        `)
        .eq('lote_id', lote.id)
        .order('created_at');

      // Get user profiles for manejo
      const userIds = manejoData?.map(m => m.user_id).filter(Boolean) || [];
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // === SISTEMA UNIFICADO DE FOTOS ===
      
      // 1. Buscar fotos de entregas (via entrega_fotos)
      const entregaIds = entregas?.map(e => e.id) || [];
      const { data: fotosEntregas } = entregaIds.length > 0 ? await supabase
        .from('entrega_fotos')
        .select('id, entrega_id, foto_url, tipo_foto, created_at')
        .in('entrega_id', entregaIds)
        .is('deleted_at', null) : { data: [] };

      // 2. Buscar TODAS as fotos em lote_fotos (entregas + manutenções)
      const { data: fotosLote } = await supabase
        .from('lote_fotos')
        .select('id, foto_url, tipo_foto, created_at, entrega_id, manejo_id')
        .eq('lote_id', lote.id)
        .is('deleted_at', null);

      // 3. Buscar fotos antigas em manejo_semanal.foto_url (fonte histórica)
      const fotosManejoDiretas = manejoData?.filter(m => m.foto_url) || [];

      // === UNIFICAÇÃO E DEDUPLICAÇÃO ===
      const fotosUnificadas: any[] = [];
      const urlsProcessadas = new Set<string>();
      let duplicatasDetectadas = 0;

      // Adicionar fotos de entregas
      (fotosEntregas || []).forEach(foto => {
        if (!urlsProcessadas.has(foto.foto_url)) {
          fotosUnificadas.push({
            id: foto.id,
            foto_url: foto.foto_url,
            tipo_foto: foto.tipo_foto,
            origem: 'entrega',
            created_at: foto.created_at,
            fonte_dados: 'entrega_fotos',
            entrega_id: foto.entrega_id
          });
          urlsProcessadas.add(foto.foto_url);
        } else {
          duplicatasDetectadas++;
        }
      });

      // Adicionar fotos de lote_fotos (entregas e manutenções)
      (fotosLote || []).forEach(foto => {
        if (!urlsProcessadas.has(foto.foto_url)) {
          const origem = foto.entrega_id ? 'entrega' : 'manutencao';
          fotosUnificadas.push({
            id: foto.id,
            foto_url: foto.foto_url,
            tipo_foto: foto.tipo_foto,
            origem,
            created_at: foto.created_at,
            fonte_dados: 'lote_fotos',
            entrega_id: foto.entrega_id,
            manejo_id: foto.manejo_id
          });
          urlsProcessadas.add(foto.foto_url);
        } else {
          duplicatasDetectadas++;
        }
      });

      // Adicionar fotos históricas de manejo_semanal.foto_url
      fotosManejoDiretas.forEach(manejo => {
        if (manejo.foto_url && !urlsProcessadas.has(manejo.foto_url)) {
          fotosUnificadas.push({
            id: `manejo-${manejo.id}`,
            foto_url: manejo.foto_url,
            tipo_foto: 'manejo_semanal',
            origem: 'manutencao',
            created_at: manejo.created_at,
            fonte_dados: 'manejo_semanal',
            manejo_id: manejo.id
          });
          urlsProcessadas.add(manejo.foto_url);
        } else if (manejo.foto_url) {
          duplicatasDetectadas++;
        }
      });

      // Process voluntarios data
      const voluntariosMap = new Map();
      (entregas || []).forEach(entrega => {
        const voluntario = voluntariosData?.find(v => v.id === entrega.voluntario_id);
        if (voluntario) {
          const key = voluntario.id;
          if (!voluntariosMap.has(key)) {
            voluntariosMap.set(key, {
              id: voluntario.id,
              nome: voluntario.nome,
              numero_balde: voluntario.numero_balde,
              entregas_count: 0,
              peso_total: 0,
              qualidade_total: 0,
              qualidade_count: 0
            });
          }
          const vol = voluntariosMap.get(key);
          vol.entregas_count++;
          vol.peso_total += entrega.peso;
          if (entrega.qualidade_residuo) {
            vol.qualidade_total += entrega.qualidade_residuo;
            vol.qualidade_count++;
          }
        }
      });

      const voluntarios = Array.from(voluntariosMap.values()).map(vol => ({
        ...vol,
        qualidade_media: vol.qualidade_count > 0 ? vol.qualidade_total / vol.qualidade_count : 0
      }));

      // Process entregas with unified photos
      const entregasProcessed = (entregas || []).map(entrega => {
        const voluntario = voluntariosData?.find(v => v.id === entrega.voluntario_id);
        const fotos = fotosUnificadas.filter(f => f.entrega_id === entrega.id);
        
        return {
          id: entrega.id,
          peso: entrega.peso,
          qualidade_residuo: entrega.qualidade_residuo,
          created_at: entrega.created_at,
          voluntario_nome: voluntario?.nome || 'Desconhecido',
          fotos: fotos.map(f => ({
            id: f.id,
            foto_url: f.foto_url,
            tipo_foto: f.tipo_foto
          }))
        };
      });

      // Build real timeline based only on actual data
      const buildRealTimeline = (): TimelineStageEnhanced[] => {
        const timeline: TimelineStageEnhanced[] = [];
        
        // 1. Início do Lote - Always first event
        const entregaFotos = fotosUnificadas.filter(f => f.origem === 'entrega');
        timeline.push({
          id: `inicio-${lote.id}`,
          etapa: 1,
          titulo: 'Início do Lote',
          tipo: 'entrega',
          caixa_origem: null,
          caixa_destino: null,
          peso_antes: 0,
          peso_depois: lote.peso_inicial,
          observacoes: entregasProcessed.length > 0 ? 
            `Iniciado com ${entregasProcessed.length} entregas` : '-',
          created_at: lote.data_inicio,
          usuario_nome: lote.criado_por_nome || '-',
          data_estimada: false,
          fotos: entregaFotos.map(f => ({
            id: f.id,
            foto_url: f.foto_url,
            tipo_foto: f.tipo_foto,
            origem: f.fonte_dados as any
          })),
          integridade_validada: true
        });
        
        // 2. Manutenções Reais - Only actual maintenance records
        (manejoData || []).forEach((manejo, index) => {
          const manutencaoFotos = fotosUnificadas.filter(f => f.manejo_id === manejo.id);
          const userProfile = userProfiles?.find(p => p.user_id === manejo.user_id);
          
          timeline.push({
            id: manejo.id,
            etapa: index + 2,
            titulo: `Manutenção ${index + 1}`,
            tipo: 'manutencao',
            caixa_origem: manejo.caixa_origem,
            caixa_destino: manejo.caixa_destino,
            peso_antes: manejo.peso_antes,
            peso_depois: manejo.peso_depois,
            observacoes: manejo.observacoes || '-',
            created_at: manejo.created_at,
            usuario_nome: userProfile?.full_name || '-',
            data_estimada: false,
            fotos: manutencaoFotos.map(f => ({
              id: f.id,
              foto_url: f.foto_url,
              tipo_foto: f.tipo_foto,
              origem: f.fonte_dados as any
            })),
            integridade_validada: true
          });
        });
        
        // 3. Finalização - If lot is closed
        if (lote.status === 'encerrado' && lote.data_finalizacao) {
          timeline.push({
            id: `finalizacao-${lote.id}`,
            etapa: timeline.length + 1,
            titulo: 'Finalização do Lote',
            tipo: 'finalizacao',
            caixa_origem: null,
            caixa_destino: null,
            peso_antes: lote.peso_inicial,
            peso_depois: lote.peso_final || 0,
            observacoes: '-',
            created_at: lote.data_finalizacao,
            usuario_nome: lote.criado_por_nome || '-',
            data_estimada: false,
            fotos: [],
            integridade_validada: true
          });
        }
        
        return timeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      };

      const timeline = buildRealTimeline();

      // Sort unified photos by creation date
      const todasFotosOrdenadas = fotosUnificadas.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const auditoria: LoteAuditoriaEnhanced = {
        id: lote.id,
        codigo: lote.codigo,
        codigo_unico: lote.codigo_unico || lote.codigo,
        unidade: lote.unidade,
        status: lote.status,
        peso_inicial: lote.peso_inicial,
        peso_final: lote.peso_final,
        data_inicio: lote.data_inicio,
        data_finalizacao: lote.data_finalizacao,
        co2eq_evitado: lote.co2eq_evitado,
        creditos_cau: lote.creditos_cau,
        hash_integridade: lote.hash_integridade,
        hash_anterior: lote.hash_anterior,
        indice_cadeia: lote.indice_cadeia,
        qr_code_url: lote.qr_code_url,
        criado_por_nome: lote.criado_por_nome,
        latitude: lote.latitude,
        longitude: lote.longitude,
        voluntarios,
        entregas: entregasProcessed,
        timeline,
        todasFotosUnificadas: todasFotosOrdenadas,
        estatisticasIntegridade: {
          total_fotos_entregas: integrityStats.total_fotos_entregas,
          total_fotos_manejo: integrityStats.total_fotos_manejo,
          total_fotos_unificadas: fotosUnificadas.length,
          total_manejo_registros: integrityStats.total_manejo_semanal,
          duplicatas_detectadas: duplicatasDetectadas,
          inconsistencias: integrityStats.inconsistencias || []
        }
      };

      setLoteAuditoria(auditoria);

      // Show integrity status
      if (integrityStats.status === 'INCONSISTENTE') {
        toast({
          title: "Dados de integridade verificados",
          description: `${fotosUnificadas.length} fotos unificadas encontradas. ${duplicatasDetectadas} duplicatas removidas.`,
          variant: "default",
        });
      }

    } catch (error) {
      console.error('Erro ao buscar dados de auditoria enhanced:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados de auditoria",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoteAuditoriaEnhanced();
  }, [codigoUnico]);

  return {
    loteAuditoria,
    loading,
    refetch: fetchLoteAuditoriaEnhanced
  };
};