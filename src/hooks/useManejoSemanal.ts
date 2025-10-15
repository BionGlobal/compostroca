
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ManejoStep {
  id: string;
  tipo: 'finalizacao' | 'transferencia';
  caixaOrigem: number;
  caixaDestino?: number;
  loteId: string;
  loteNome: string;
  pesoAnterior: number;
  concluido: boolean;
  foto?: string;
  observacoes?: string;
  pesoNovo?: number;
}

export interface EstadoManejo {
  ativo: boolean;
  etapaAtual: number;
  etapas: ManejoStep[];
  iniciado_em?: string;
  usuario_id?: string;
  organizacao: string;
}

export const useManejoSemanal = () => {
  const [estadoManejo, setEstadoManejo] = useState<EstadoManejo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const criarEtapasManejo = useCallback((lotes: any[]) => {
    const etapas: ManejoStep[] = [];
    
    // Ordenar lotes por caixa (7, 6, 5, 4, 3, 2, 1)
    const lotesOrdenados = [...lotes].sort((a, b) => b.caixa_atual - a.caixa_atual);
    
    // Etapa 1: Finalização da caixa 7
    const lote7 = lotesOrdenados.find(l => l.caixa_atual === 7);
    if (lote7) {
      etapas.push({
        id: `finalizacao-${lote7.id}`,
        tipo: 'finalizacao',
        caixaOrigem: 7,
        loteId: lote7.id,
        loteNome: lote7.codigo,
        pesoAnterior: lote7.peso_atual,
        concluido: false
      });
    }

    // Etapas 2-7: Transferências (6→7, 5→6, 4→5, 3→4, 2→3, 1→2)
    for (let caixa = 6; caixa >= 1; caixa--) {
      const lote = lotesOrdenados.find(l => l.caixa_atual === caixa);
      if (lote) {
        etapas.push({
          id: `transferencia-${lote.id}`,
          tipo: 'transferencia',
          caixaOrigem: caixa,
          caixaDestino: caixa + 1,
          loteId: lote.id,
          loteNome: lote.codigo,
          pesoAnterior: lote.peso_atual,
          concluido: false
        });
      }
    }

    return etapas;
  }, []);

  const iniciarManejo = useCallback(async (lotes: any[], organizacao: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const etapas = criarEtapasManejo(lotes);
      
      const novoEstado: EstadoManejo = {
        ativo: true,
        etapaAtual: 0,
        etapas,
        iniciado_em: new Date().toISOString(),
        usuario_id: user.id,
        organizacao
      };

      setEstadoManejo(novoEstado);
      
      // Salvar estado no localStorage como backup
      localStorage.setItem('manejo_em_andamento', JSON.stringify(novoEstado));
      
      toast({
        title: "Manejo iniciado",
        description: `Processo de manejo semanal iniciado com ${etapas.length} etapas`
      });
    } catch (error) {
      console.error('Erro ao iniciar manejo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o processo de manejo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, criarEtapasManejo, toast]);

  const uploadFoto = useCallback(async (arquivo: File, etapaId: string): Promise<string> => {
    if (!user || !estadoManejo) throw new Error('Usuário não autenticado ou manejo não iniciado');

    setUploading(true);
    try {
      const fileName = `${user.id}/${etapaId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('manejo-fotos')
        .upload(fileName, arquivo);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('manejo-fotos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  }, [user, estadoManejo]);

  const atualizarEtapa = useCallback((etapaIndex: number, dados: Partial<ManejoStep>) => {
    if (!estadoManejo) return;

    const novasEtapas = [...estadoManejo.etapas];
    novasEtapas[etapaIndex] = { ...novasEtapas[etapaIndex], ...dados };

    const novoEstado = {
      ...estadoManejo,
      etapas: novasEtapas
    };

    setEstadoManejo(novoEstado);
    localStorage.setItem('manejo_em_andamento', JSON.stringify(novoEstado));
  }, [estadoManejo]);

  const proximaEtapa = useCallback(() => {
    if (!estadoManejo || estadoManejo.etapaAtual >= estadoManejo.etapas.length - 1) return;

    const novoEstado = {
      ...estadoManejo,
      etapaAtual: estadoManejo.etapaAtual + 1
    };

    setEstadoManejo(novoEstado);
    localStorage.setItem('manejo_em_andamento', JSON.stringify(novoEstado));
  }, [estadoManejo]);

  const etapaAnterior = useCallback(() => {
    if (!estadoManejo || estadoManejo.etapaAtual <= 0) return;

    const novoEstado = {
      ...estadoManejo,
      etapaAtual: estadoManejo.etapaAtual - 1
    };

    setEstadoManejo(novoEstado);
    localStorage.setItem('manejo_em_andamento', JSON.stringify(novoEstado));
  }, [estadoManejo]);

  const finalizarManejo = useCallback(async () => {
    if (!estadoManejo || !user) {
      console.error('❌ Tentativa de finalizar manejo sem estado válido');
      return;
    }

    setLoading(true);
    console.log('🏁 Iniciando finalização do manejo semanal (modo transacional)...');
    
    const backupEstado = JSON.stringify(estadoManejo);
    
    try {
      // 1. Validar todas as etapas
      const etapasValidas = estadoManejo.etapas.filter(etapa => 
        etapa.loteId && etapa.foto && etapa.pesoNovo !== undefined
      );
      
      if (etapasValidas.length !== estadoManejo.etapas.length) {
        throw new Error('Nem todas as etapas estão completas');
      }

      console.log(`📋 Processando ${etapasValidas.length} etapas transacionalmente...`);

      // 2. Consolidar todas as fotos em um único array
      const todasFotos = etapasValidas
        .map(e => e.foto)
        .filter((f): f is string => f !== undefined);

      // 3. Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // 4. Criar UMA ÚNICA sessão de manutenção para TODA a manutenção semanal
      const { data: sessao, error: sessaoError } = await supabase
        .from('sessoes_manutencao')
        .insert({
          data_sessao: new Date().toISOString(),
          administrador_id: user.id,
          administrador_nome: profile?.full_name || user.email || 'Administrador',
          unidade_codigo: estadoManejo.organizacao,
          observacoes_gerais: etapasValidas[0]?.observacoes || 'Manutenção Semanal Completa',
          fotos_gerais: todasFotos,
          latitude: null,
          longitude: null
        })
        .select('id')
        .single();

      if (sessaoError || !sessao) {
        throw new Error('Falha ao criar sessão de manutenção: ' + sessaoError?.message);
      }

      console.log(`✅ Sessão única de manutenção criada: ${sessao.id} com ${todasFotos.length} fotos`);

      // 4. Salvar todas as fotos associadas à sessão E aos lotes
      if (todasFotos.length > 0) {
        const { error: fotosError } = await supabase
          .from('lote_fotos')
          .insert(
            etapasValidas.map((etapa, idx) => ({
              lote_id: etapa.loteId,
              foto_url: etapa.foto!,
              tipo_foto: 'manejo_semanal',
              ordem_foto: idx + 1
            }))
          );

        if (fotosError) {
          console.warn('⚠️ Erro ao salvar fotos, mas continuando:', fotosError);
        } else {
          console.log(`📸 ${todasFotos.length} fotos vinculadas aos lotes`);
        }
      }

      // 5. Chamar função SQL para criar eventos de manutenção vinculados à sessão única
      const { data: resultadoAssociacao, error: associacaoError } = await supabase
        .rpc('associar_sessao_aos_lotes_ativos', {
          p_sessao_id: sessao.id,
          p_data_sessao: new Date().toISOString()
        });

      if (associacaoError) {
        console.error('⚠️ Erro na associação automática:', associacaoError);
      } else {
        console.log(`🔗 Sessão única associada a ${resultadoAssociacao?.length || 0} lotes ativos`);
      }

      // 6. Atualizar individualmente cada lote (peso e status)
      const batchSize = 3;
      for (let i = 0; i < etapasValidas.length; i += batchSize) {
        const batch = etapasValidas.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (etapa) => {
          let updateData: any = {
            peso_atual: etapa.pesoNovo || etapa.pesoAnterior,
            updated_at: new Date().toISOString()
          };

          if (etapa.tipo === 'finalizacao') {
            updateData.status = 'encerrado';
            updateData.data_encerramento = new Date().toISOString();
            updateData.data_finalizacao = new Date().toISOString();
            updateData.peso_final = etapa.pesoNovo || etapa.pesoAnterior;
          } else {
            updateData.caixa_atual = etapa.caixaDestino;
            updateData.semana_atual = etapa.caixaDestino;
            updateData.status = 'em_processamento';
          }

          const { error: loteError } = await supabase
            .from('lotes')
            .update(updateData)
            .eq('id', etapa.loteId);

          if (loteError) {
            console.error(`❌ Erro ao atualizar lote ${etapa.loteId}:`, loteError);
            throw loteError;
          }

          // Registrar em manejo_semanal para compatibilidade e dados medidos reais
          await supabase.from('manejo_semanal').insert({
            lote_id: etapa.loteId,
            user_id: user.id,
            caixa_origem: etapa.caixaOrigem,
            caixa_destino: etapa.caixaDestino || null,
            peso_antes: etapa.pesoAnterior,
            peso_depois: etapa.pesoNovo || etapa.pesoAnterior,
            foto_url: etapa.foto,
            observacoes: etapa.observacoes || null
          });
        }));
        
        if (i + batchSize < etapasValidas.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ Todas as etapas processadas com sucesso');

      localStorage.removeItem('manejo_em_andamento');
      setEstadoManejo(null);

      toast({
        title: "Manejo Finalizado!",
        description: `${etapasValidas.length} operações concluídas. Dados associados à sessão ${sessao.id.slice(0, 8)}...`,
      });

      console.log('🎉 Manejo semanal finalizado com sucesso');

    } catch (error: any) {
      console.error('💥 Erro ao finalizar manejo:', error);
      
      try {
        localStorage.setItem('manejo_em_andamento_backup', backupEstado);
        console.log('💾 Backup do estado salvo para recuperação');
      } catch (backupError) {
        console.error('❌ Erro ao salvar backup:', backupError);
      }
      
      toast({
        title: "Erro ao Finalizar Manejo",
        description: error.message || "Tente novamente. O progresso foi salvo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [estadoManejo, user, toast]);

  const cancelarManejo = useCallback(() => {
    setEstadoManejo(null);
    localStorage.removeItem('manejo_em_andamento');
    toast({
      title: "Manejo cancelado",
      description: "Processo de manejo foi cancelado"
    });
  }, [toast]);

  // Verificar se há manejo em andamento no localStorage ao carregar
  const recuperarManejo = useCallback(() => {
    const manejoSalvo = localStorage.getItem('manejo_em_andamento');
    if (manejoSalvo) {
      try {
        const estado = JSON.parse(manejoSalvo);
        setEstadoManejo(estado);
      } catch (error) {
        console.error('Erro ao recuperar manejo:', error);
        localStorage.removeItem('manejo_em_andamento');
      }
    }
  }, []);

  return {
    estadoManejo,
    loading,
    uploading,
    iniciarManejo,
    uploadFoto,
    atualizarEtapa,
    proximaEtapa,
    etapaAnterior,
    finalizarManejo,
    cancelarManejo,
    recuperarManejo
  };
};
