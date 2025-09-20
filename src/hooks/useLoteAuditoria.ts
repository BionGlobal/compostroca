import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  manutencoes: Array<{
    id: string;
    semana_numero: number;
    peso_antes: number;
    peso_depois: number;
    observacoes: string;
    acao_tipo: string;
    created_at: string;
    usuario_nome: string;
    fotos: Array<{
      id: string;
      foto_url: string;
      tipo_foto: string;
    }>;
  }>;
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

      // Get entrega fotos separately
      const entregaIds = entregas?.map(e => e.id) || [];
      const { data: entregaFotos, error: entregaFotosError } = await supabase
        .from('entrega_fotos')
        .select('id, foto_url, tipo_foto, entrega_id')
        .in('entrega_id', entregaIds);

      if (entregasError) {
        console.error('Erro ao buscar entregas:', entregasError);
      }

      if (voluntariosError) {
        console.error('Erro ao buscar voluntários:', voluntariosError);
      }

      if (entregaFotosError) {
        console.error('Erro ao buscar fotos de entregas:', entregaFotosError);
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
        .eq('lote_id', lote.id);

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
        const fotos = entregaFotos?.filter(f => f.entrega_id === entrega.id) || [];
        
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

      // Process manutencoes with fotos - directly from manejo_semanal
      const manutencoesProcessed = (manejoData || []).map((manejo, index) => {
        const userProfile = userProfiles?.find(p => p.user_id === manejo.user_id);
        const manejoFotos = (lotefotos || []).filter(foto => foto.manejo_id === manejo.id);
        
        // Determine action type based on caixa_destino
        let acaoTipo = '';
        if (manejo.caixa_destino) {
          acaoTipo = `TRANSFERÊNCIA ${manejo.caixa_origem} → ${manejo.caixa_destino}`;
        } else {
          acaoTipo = 'FINALIZAÇÃO';
        }
        
        return {
          id: manejo.id,
          semana_numero: index + 1, // Sequential numbering since we order by created_at
          peso_antes: manejo.peso_antes,
          peso_depois: manejo.peso_depois,
          observacoes: manejo.observacoes || '',
          acao_tipo: acaoTipo,
          created_at: manejo.created_at,
          usuario_nome: userProfile?.full_name || 'Usuário Desconhecido',
          fotos: manejoFotos.map(foto => ({
            id: foto.id,
            foto_url: foto.foto_url,
            tipo_foto: foto.tipo_foto
          }))
        };
      });

      // Combine all photos with origin
      const todasFotos = [
        // Fotos de entregas
        ...(entregaFotos || []).map(foto => ({
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          origem: 'entrega' as const,
          created_at: entregas?.find(e => e.id === foto.entrega_id)?.created_at || ''
        })),
        // Fotos de lote (manutenções)
        ...(lotefotos || []).map(foto => ({
          id: foto.id,
          foto_url: foto.foto_url,
          tipo_foto: foto.tipo_foto,
          origem: 'manutencao' as const,
          created_at: foto.created_at
        }))
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
        manutencoes: manutencoesProcessed,
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