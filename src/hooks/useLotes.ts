import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLoteUpdates } from '@/contexts/LoteContext';

export interface Lote {
  id: string;
  codigo: string;
  unidade: string;
  linha_producao: string;
  caixa_atual: number;
  semana_atual: number;
  status: 'ativo' | 'em_processamento' | 'encerrado';
  data_inicio: string;
  data_encerramento?: string;
  data_proxima_transferencia?: string;
  data_finalizacao?: string;
  latitude?: number;
  longitude?: number;
  peso_inicial: number;
  peso_atual: number;
  peso_final?: number;
  iot_data?: any;
  criado_por: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export const useLotes = () => {
  const [loteAtivoCaixa01, setLoteAtivoCaixa01] = useState<Lote | null>(null);
  const [voluntariosCount, setVoluntariosCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { notifyLoteUpdate, subscribeToLoteUpdates } = useLoteUpdates();

  const fetchVoluntariosCount = async (loteCode: string) => {
    try {
      console.log('🔍 Buscando voluntários para lote:', loteCode);
      const { data, error } = await supabase
        .from('entregas')
        .select('voluntario_id')
        .eq('lote_codigo', loteCode);

      if (error) {
        console.error('Erro ao buscar entregas:', error);
        throw error;
      }

      console.log('📊 Entregas encontradas:', data);
      
      // Contar voluntários únicos
      const uniqueVoluntarios = new Set(data?.map(entrega => entrega.voluntario_id) || []);
      const count = uniqueVoluntarios.size;
      
      console.log('👥 Voluntários únicos encontrados:', count);
      setVoluntariosCount(count);
    } catch (error) {
      console.error('Erro ao buscar contagem de voluntários:', error);
      setVoluntariosCount(0);
    }
  };

  const fetchLoteAtivoCaixa01 = async () => {
    if (!user || !profile) {
      console.log('❌ Usuário ou perfil não disponível');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Buscando lote ativo da organização:', profile.organization_code);
      
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .eq('caixa_atual', 1)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar lote:', error);
        throw error;
      }

      console.log('📦 Lote encontrado:', data);
      setLoteAtivoCaixa01(data ? data as Lote : null);
      
      // Se há um lote ativo, buscar contagem de voluntários
      if (data) {
        await fetchVoluntariosCount(data.codigo);
      } else {
        console.log('ℹ️ Nenhum lote ativo encontrado');
        setVoluntariosCount(0);
      }
    } catch (error) {
      console.error('Erro ao buscar lote ativo na caixa 01:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar informações do lote ativo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarCodigoLote = (unidade: string, linhaProducao: string) => {
    const agora = new Date();
    const dia = agora.getDate().toString().padStart(2, '0');
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const ano = agora.getFullYear().toString();
    // Adicionar 3 dígitos aleatórios para permitir múltiplos lotes por dia (teste)
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${unidade}-${dia}${mes}${ano}${linhaProducao}${randomDigits}`;
  };

  const getProximaSegunda = () => {
    const hoje = new Date();
    const diasAteSegunda = (8 - hoje.getDay()) % 7 || 7;
    const proximaSegunda = new Date(hoje);
    proximaSegunda.setDate(hoje.getDate() + diasAteSegunda);
    proximaSegunda.setHours(8, 0, 0, 0); // 8h da manhã
    return proximaSegunda;
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  };

  const criarNovoLote = async () => {
    if (!user || !profile) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return null;
    }

    try {
      setLoading(true);
      console.log('🆕 Criando novo lote...');

      // Verificar se já existe lote ativo na caixa 01
      if (loteAtivoCaixa01) {
        toast({
          title: "Atenção",
          description: "Já existe um lote ativo na Caixa 01",
          variant: "destructive",
        });
        return null;
      }

      // Capturar geolocalização
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      // Gerar código único
      const codigo = gerarCodigoLote(profile.organization_code, 'A');
      console.log('🏷️ Código gerado:', codigo);

      // Criar novo lote
      const novoLote = {
        codigo,
        unidade: profile.organization_code,
        linha_producao: 'A',
        caixa_atual: 1,
        semana_atual: 1,
        status: 'ativo' as const,
        data_proxima_transferencia: getProximaSegunda().toISOString(),
        latitude,
        longitude,
        peso_inicial: 0,
        peso_atual: 0,
        criado_por: user.id,
        criado_por_nome: profile.full_name || user.email || 'Usuário',
      };

      const { data, error } = await supabase
        .from('lotes')
        .insert(novoLote)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Lote criado com sucesso:', data);
      setLoteAtivoCaixa01(data as Lote);
      
      // Notificar outros componentes
      notifyLoteUpdate();
      
      toast({
        title: "Sucesso",
        description: `Lote ${codigo} criado com sucesso!`,
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao criar novo lote:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o lote",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const encerrarLote = async (loteId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);
      console.log('🔒 Finalizando entregas do lote:', loteId);

      // Calcular peso inicial total com cepilho (35% adicional)
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('peso')
        .eq('lote_codigo', loteAtivoCaixa01?.codigo)
        .is('deleted_at', null);

      if (entregasError) throw entregasError;

      const pesoEntregas = entregas?.reduce((acc, entrega) => acc + Number(entrega.peso), 0) || 0;
      const pesoInicialTotal = pesoEntregas + (pesoEntregas * 0.35); // Resíduos + cepilho (35%)

      console.log('📊 Peso das entregas:', pesoEntregas, 'kg');
      console.log('📊 Peso inicial total (com cepilho):', pesoInicialTotal, 'kg');

      const { error } = await supabase
        .from('lotes')
        .update({
          status: 'em_processamento',
          data_encerramento: new Date().toISOString(),
          peso_inicial: pesoInicialTotal,
          peso_atual: pesoInicialTotal,
        })
        .eq('id', loteId);

      if (error) throw error;

      console.log('✅ Entregas finalizadas - lote transferido para esteira de produção');
      setLoteAtivoCaixa01(null);
      setVoluntariosCount(0);
      
      // Notificar outros componentes
      notifyLoteUpdate();
      
      toast({
        title: "Sucesso",
        description: `Entregas finalizadas! Lote transferido para a esteira com ${pesoInicialTotal.toFixed(1)}kg (incluindo cepilho).`,
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao encerrar lote:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível encerrar o lote",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarPesoLote = async (loteId: string, novoPeso: number) => {
    try {
      console.log('⚖️ Atualizando peso do lote:', loteId, 'para:', novoPeso);
      
      const { error } = await supabase
        .from('lotes')
        .update({ peso_atual: novoPeso })
        .eq('id', loteId);

      if (error) throw error;

      console.log('✅ Peso atualizado com sucesso');
      
      // Atualizar estado local
      if (loteAtivoCaixa01?.id === loteId) {
        setLoteAtivoCaixa01(prev => prev ? { ...prev, peso_atual: novoPeso } : null);
        // Atualizar contagem de voluntários também
        await fetchVoluntariosCount(loteAtivoCaixa01.codigo);
      }
      
      // Notificar outros hooks sobre a mudança
      notifyLoteUpdate();
    } catch (error) {
      console.error('Erro ao atualizar peso do lote:', error);
    }
  };

  const cancelarLote = async (loteId: string) => {
    if (!user || !loteAtivoCaixa01) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou lote não encontrado",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);
      console.log('🗑️ Cancelando lote:', loteId, 'código:', loteAtivoCaixa01.codigo);

      // 1. Buscar entregas do lote
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('id')
        .eq('lote_codigo', loteAtivoCaixa01.codigo);

      if (entregasError) throw entregasError;

      // 2. Deletar fotos das entregas
      if (entregas && entregas.length > 0) {
        console.log('📸 Deletando fotos das entregas...');
        const entregaIds = entregas.map(e => e.id);
        
        const { error: deleteFotosEntregasError } = await supabase
          .from('entrega_fotos')
          .delete()
          .in('entrega_id', entregaIds);

        if (deleteFotosEntregasError) {
          console.error('Erro ao deletar fotos das entregas:', deleteFotosEntregasError);
          throw deleteFotosEntregasError;
        }
      }

      // 3. Deletar entregas
      console.log('📦 Deletando entregas...');
      const { error: deleteEntregasError } = await supabase
        .from('entregas')
        .delete()
        .eq('lote_codigo', loteAtivoCaixa01.codigo);

      if (deleteEntregasError) {
        console.error('Erro ao deletar entregas:', deleteEntregasError);
        throw deleteEntregasError;
      }

      // 4. Deletar fotos do lote
      console.log('🖼️ Deletando fotos do lote...');
      const { error: deleteFotosLoteError } = await supabase
        .from('lote_fotos')
        .delete()
        .eq('lote_id', loteId);

      if (deleteFotosLoteError) {
        console.error('Erro ao deletar fotos do lote:', deleteFotosLoteError);
        throw deleteFotosLoteError;
      }

      // 5. Deletar registros de manejo semanal
      console.log('🔄 Deletando registros de manejo semanal...');
      const { error: deleteManejoError } = await supabase
        .from('manejo_semanal')
        .delete()
        .eq('lote_id', loteId);

      if (deleteManejoError) {
        console.error('Erro ao deletar manejo semanal:', deleteManejoError);
        throw deleteManejoError;
      }

      // 6. Deletar o lote
      console.log('🗂️ Deletando lote...');
      const { error: deleteLoteError } = await supabase
        .from('lotes')
        .delete()
        .eq('id', loteId);

      if (deleteLoteError) {
        console.error('Erro ao deletar lote:', deleteLoteError);
        throw deleteLoteError;
      }

      // 7. Log da atividade
      await supabase
        .rpc('log_user_activity', {
          p_user_id: user.id,
          p_action_type: 'DELETE',
          p_action_description: `Lote ${loteAtivoCaixa01.codigo} cancelado completamente`,
          p_table_affected: 'lotes',
          p_record_id: loteId
        });

      console.log('✅ Lote cancelado com sucesso - Caixa 1 liberada');
      setLoteAtivoCaixa01(null);
      setVoluntariosCount(0);
      
      // Notificar outros componentes
      notifyLoteUpdate();
      
      toast({
        title: "Lote Cancelado",
        description: `Lote ${loteAtivoCaixa01.codigo} foi cancelado completamente e a Caixa 1 está liberada.`,
      });

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao cancelar lote:', error);
      toast({
        title: "Erro ao Cancelar",
        description: `Falha: ${error.message || "Não foi possível cancelar o lote"}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to lote updates
  useEffect(() => {
    const unsubscribe = subscribeToLoteUpdates(() => {
      console.log('🔄 Recebida notificação de atualização de lote');
      fetchLoteAtivoCaixa01();
    });

    return unsubscribe;
  }, [subscribeToLoteUpdates]);

  useEffect(() => {
    if (user && profile) {
      fetchLoteAtivoCaixa01();
    }
  }, [user, profile]);

  return {
    loteAtivoCaixa01,
    voluntariosCount,
    loading,
    criarNovoLote,
    encerrarLote,
    cancelarLote,
    atualizarPesoLote,
    refetch: fetchLoteAtivoCaixa01,
  };
};
