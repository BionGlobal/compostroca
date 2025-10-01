import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimelineStage {
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
  }>;
}

export interface LoteAuditoria {
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
  timeline: TimelineStage[];
  todasFotos: Array<{
    id: string;
    foto_url: string;
    tipo_foto: string;
    origem: 'entrega' | 'manutencao';
    created_at: string;
  }>;
}

export const useLoteAuditoria = (codigoUnico?: string) => {
  const [loteAuditoria, setLoteAuditoria] = useState<LoteAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLoteAuditoria = async () => {
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

      // Get entregas with voluntarios
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select(`
          id, peso, qualidade_residuo, created_at, voluntario_id
        `)
        .eq('lote_id', lote.id);

      // Get voluntarios data separately
      const voluntarioIds = entregas?.map(e => e.voluntario_id).filter(Boolean) || [];
      const { data: voluntariosData, error: voluntariosError } = await supabase
        .from('voluntarios')
        .select('id, nome, numero_balde')
        .in('id', voluntarioIds);

      if (entregasError) {
        console.error('Erro ao buscar entregas:', entregasError);
      }

      if (voluntariosError) {
        console.error('Erro ao buscar voluntários:', voluntariosError);
      }

      // Get manejo_semanal data directly (bypass lotes_manutencoes which is empty)
      const { data: manejoData, error: manejoError } = await supabase
        .from('manejo_semanal')
        .select(`
          id, peso_antes, peso_depois, observacoes, created_at, user_id, caixa_origem, caixa_destino
        `)
        .eq('lote_id', lote.id)
        .order('created_at');

      // Get user profiles for manejo
      const userIds = manejoData?.map(m => m.user_id).filter(Boolean) || [];
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);


      if (manejoError) {
        console.error('Erro ao buscar dados de manejo:', manejoError);
      }

      if (profilesError) {
        console.error('Erro ao buscar perfis de usuários:', profilesError);
      }

      // Get all lote_fotos
      const { data: lotefotos, error: fotosError } = await supabase
        .from('lote_fotos')
        .select('id, foto_url, tipo_foto, created_at, manejo_id, entrega_id')
        .eq('lote_id', lote.id)
        .is('deleted_at', null);

      if (fotosError) {
        console.error('Erro ao buscar fotos do lote:', fotosError);
      }

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

      // Process entregas with fotos
      const entregasProcessed = (entregas || []).map(entrega => {
        const voluntario = voluntariosData?.find(v => v.id === entrega.voluntario_id);
        const fotos = (lotefotos || []).filter(f => f.entrega_id === entrega.id);
        
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

      // Build adaptive timeline based on real data
      const buildAdaptiveTimeline = (): TimelineStage[] => {
        const timeline: TimelineStage[] = [];
        const dataInicio = new Date(lote.data_inicio);
        const dataFinalizacao = lote.data_finalizacao ? new Date(lote.data_finalizacao) : new Date();
        
        // Calculate estimated weekly dates (7 days apart)
        const getEstimatedDate = (weekIndex: number) => {
          const date = new Date(dataInicio);
          date.setDate(date.getDate() + (weekIndex * 7));
          return date;
        };
        
        // Calculate estimated weight reduction (3.54% per week)
        const getEstimatedWeight = (initialWeight: number, weekIndex: number) => {
          return initialWeight * Math.pow(0.9646, weekIndex);
        };
        
        // 1. Etapa 1: Recebimento e Entregas (Caixa 1)
        const entregaFotos = (lotefotos || []).filter(f => f.entrega_id !== null);
        const primeiraManutencao = manejoData?.[0];
        
        timeline.push({
          id: primeiraManutencao?.id || `entrega-${lote.id}`,
          etapa: 1,
          titulo: 'Recebimento e Entregas',
          tipo: 'entrega',
          caixa_origem: 0,
          caixa_destino: 1,
          peso_antes: 0,
          peso_depois: primeiraManutencao?.peso_depois || lote.peso_inicial,
          observacoes: primeiraManutencao?.observacoes || `Lote iniciado com ${entregasProcessed.length || 0} entregas de voluntários`,
          created_at: primeiraManutencao?.created_at || lote.data_inicio,
          usuario_nome: primeiraManutencao ? userProfiles?.find(p => p.user_id === primeiraManutencao.user_id)?.full_name : lote.criado_por_nome,
          data_estimada: !primeiraManutencao,
          fotos: entregaFotos.map(f => ({
            id: f.id,
            foto_url: f.foto_url,
            tipo_foto: f.tipo_foto
          }))
        });
        
        // 2-7. Etapas 2-7: Manutenções Semanais (Caixas 2-7)
        for (let caixa = 2; caixa <= 7; caixa++) {
          const etapa = caixa;
          const manutencaoReal = manejoData?.find(m => m.caixa_destino === caixa);
          const isDataReal = !!manutencaoReal;
          
          // Get photos for this specific maintenance
          const manutencaoFotos = manutencaoReal ? 
            (lotefotos || []).filter(f => f.manejo_id === manutencaoReal.id) : [];
          
          const pesoAnterior = timeline[etapa - 2]?.peso_depois || lote.peso_inicial;
          const pesoEstimado = getEstimatedWeight(lote.peso_inicial, etapa - 1);
          
          timeline.push({
            id: manutencaoReal?.id || `estimada-${etapa}-${lote.id}`,
            etapa,
            titulo: `Manutenção Semanal - Caixa ${caixa}`,
            tipo: 'manutencao',
            caixa_origem: caixa - 1,
            caixa_destino: caixa,
            peso_antes: manutencaoReal?.peso_antes || pesoAnterior,
            peso_depois: manutencaoReal?.peso_depois || pesoEstimado,
            observacoes: manutencaoReal?.observacoes || `Transferência para caixa ${caixa} (dados estimados)`,
            created_at: manutencaoReal?.created_at || getEstimatedDate(etapa - 1).toISOString(),
            usuario_nome: manutencaoReal ? userProfiles?.find(p => p.user_id === manutencaoReal.user_id)?.full_name : 'Sistema',
            data_estimada: !isDataReal,
            fotos: manutencaoFotos.map(f => ({
              id: f.id,
              foto_url: f.foto_url,
              tipo_foto: f.tipo_foto
            }))
          });
        }
        
        // 8. Etapa 8: Finalização e Distribuição
        const ultimaManutencao = manejoData?.find(m => !m.caixa_destino) || manejoData?.[manejoData.length - 1];
        const finalizacaoFotos = ultimaManutencao && !ultimaManutencao.caixa_destino ? 
          (lotefotos || []).filter(f => f.manejo_id === ultimaManutencao.id) : [];
        
        timeline.push({
          id: ultimaManutencao?.id || `finalizacao-${lote.id}`,
          etapa: 8,
          titulo: 'Finalização e Distribuição',
          tipo: 'finalizacao',
          caixa_origem: 7,
          peso_antes: timeline[6]?.peso_depois || getEstimatedWeight(lote.peso_inicial, 6),
          peso_depois: lote.peso_final,
          observacoes: ultimaManutencao?.observacoes || 'Composto finalizado e pronto para distribuição',
          created_at: lote.data_finalizacao || ultimaManutencao?.created_at || getEstimatedDate(7).toISOString(),
          usuario_nome: ultimaManutencao ? userProfiles?.find(p => p.user_id === ultimaManutencao.user_id)?.full_name : lote.criado_por_nome,
          data_estimada: !lote.data_finalizacao && !ultimaManutencao,
          fotos: finalizacaoFotos.map(f => ({
            id: f.id,
            foto_url: f.foto_url,
            tipo_foto: f.tipo_foto
          }))
        });
        
        return timeline;
      };
      
      const timeline = buildAdaptiveTimeline();

      // Combine all photos with origin
      const todasFotos = (lotefotos || []).map(foto => {
        const origem: 'entrega' | 'manutencao' = foto.entrega_id ? 'entrega' : 'manutencao';
        const created_at = foto.entrega_id ? 
          entregas?.find(e => e.id === foto.entrega_id)?.created_at || foto.created_at :
          foto.created_at;
        
        return {
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          origem,
          created_at
        };
      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const auditoria: LoteAuditoria = {
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
        todasFotos
      };

      setLoteAuditoria(auditoria);

    } catch (error) {
      console.error('Erro ao buscar dados de auditoria:', error);
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
    fetchLoteAuditoria();
  }, [codigoUnico]);

  return {
    loteAuditoria,
    loading,
    refetch: fetchLoteAuditoria
  };
};