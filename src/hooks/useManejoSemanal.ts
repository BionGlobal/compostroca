
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
    console.log('🏁 Iniciando finalização do manejo semanal...');
    
    // Backup do estado atual
    const backupEstado = JSON.stringify(estadoManejo);
    
    try {
      // Validar dados antes de prosseguir
      const etapasValidas = estadoManejo.etapas.filter(etapa => 
        etapa.loteId && 
        etapa.foto && 
        etapa.pesoNovo !== undefined
      );
      
      if (etapasValidas.length !== estadoManejo.etapas.length) {
        throw new Error('Nem todas as etapas estão completas');
      }

      console.log(`📋 Processando ${etapasValidas.length} etapas válidas...`);

      // Processar em lotes para evitar sobrecarga
      const batchSize = 3;
      for (let i = 0; i < etapasValidas.length; i += batchSize) {
        const batch = etapasValidas.slice(i, i + batchSize);
        
        // Processar etapas do lote em paralelo
        const etapaPromises = batch.map(async (etapa) => {
          console.log(`📦 Processando etapa ${etapa.id}`);
          
          // Atualizar lote
          let updateData: any = {
            peso_atual: etapa.pesoNovo || etapa.pesoAnterior,
            updated_at: new Date().toISOString()
          };

          if (etapa.tipo === 'finalizacao') {
            updateData.status = 'encerrado';
            updateData.data_encerramento = new Date().toISOString();
          } else {
            updateData.caixa_atual = etapa.caixaDestino;
          }

          const { error: loteError } = await supabase
            .from('lotes')
            .update(updateData)
            .eq('id', etapa.loteId);

          if (loteError) {
            console.error(`❌ Erro ao atualizar lote ${etapa.loteId}:`, loteError);
            throw loteError;
          }

          // Registrar operação no manejo_semanal
          const { error: manejoError } = await supabase
            .from('manejo_semanal')
            .insert({
              lote_id: etapa.loteId,
              user_id: user.id,
              caixa_origem: etapa.caixaOrigem,
              caixa_destino: etapa.caixaDestino || null,
              peso_antes: etapa.pesoAnterior,
              peso_depois: etapa.pesoNovo || etapa.pesoAnterior,
              foto_url: etapa.foto,
              observacoes: etapa.observacoes || null
            });

          if (manejoError) {
            console.error(`⚠️ Erro ao salvar manejo para lote ${etapa.loteId}:`, manejoError);
            // Não bloquear o processo por erro de registro
          }
        });

        await Promise.all(etapaPromises);
        
        // Pequena pausa entre lotes
        if (i + batchSize < etapasValidas.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('✅ Todas as etapas processadas com sucesso');

      // Limpar estado local com verificação
      try {
        localStorage.removeItem('manejo_em_andamento');
        setEstadoManejo(null);
        console.log('🧹 Estado local limpo');
      } catch (cleanupError) {
        console.error('⚠️ Erro ao limpar localStorage:', cleanupError);
        // Não é crítico, continuar
      }

      toast({
        title: "Manejo Finalizado!",
        description: `${etapasValidas.length} operações concluídas. Caixa 1 liberada para novos lotes.`,
      });

      console.log('🎉 Manejo semanal finalizado com sucesso');

    } catch (error: any) {
      console.error('💥 Erro ao finalizar manejo:', error);
      
      // Tentar restaurar backup se possível
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
