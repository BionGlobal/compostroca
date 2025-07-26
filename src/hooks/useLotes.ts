import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Lote {
  id: string;
  codigo: string;
  unidade: string;
  linha_producao: string;
  caixa_atual: number;
  semana_atual: number;
  status: 'ativo' | 'encerrado';
  data_inicio: string;
  data_encerramento?: string;
  data_proxima_transferencia?: string;
  latitude?: number;
  longitude?: number;
  peso_inicial: number;
  peso_atual: number;
  criado_por: string;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
}

export const useLotes = () => {
  const [loteAtivoCaixa01, setLoteAtivoCaixa01] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const fetchLoteAtivoCaixa01 = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .eq('caixa_atual', 1)
        .eq('status', 'ativo')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setLoteAtivoCaixa01(data ? data as Lote : null);
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
    return `${unidade}-${dia}${mes}${ano}${linhaProducao}`;
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
      
      // Verificar se código já existe
      const { data: existingLote } = await supabase
        .from('lotes')
        .select('codigo')
        .eq('codigo', codigo)
        .single();

      if (existingLote) {
        toast({
          title: "Erro",
          description: "Já existe um lote com este código hoje",
          variant: "destructive",
        });
        return null;
      }

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

      setLoteAtivoCaixa01(data as Lote);
      
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

      const { error } = await supabase
        .from('lotes')
        .update({
          status: 'encerrado',
          data_encerramento: new Date().toISOString(),
        })
        .eq('id', loteId);

      if (error) throw error;

      setLoteAtivoCaixa01(null);
      
      toast({
        title: "Sucesso",
        description: "Lote encerrado com sucesso!",
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
      const { error } = await supabase
        .from('lotes')
        .update({ peso_atual: novoPeso })
        .eq('id', loteId);

      if (error) throw error;

      // Atualizar estado local
      if (loteAtivoCaixa01?.id === loteId) {
        setLoteAtivoCaixa01(prev => prev ? { ...prev, peso_atual: novoPeso } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar peso do lote:', error);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchLoteAtivoCaixa01();
    }
  }, [user, profile]);

  return {
    loteAtivoCaixa01,
    loading,
    criarNovoLote,
    encerrarLote,
    atualizarPesoLote,
    refetch: fetchLoteAtivoCaixa01,
  };
};