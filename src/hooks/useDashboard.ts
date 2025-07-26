import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoluntarios } from './useVoluntarios';
import { useEntregas } from './useEntregas';
import { useAuth } from './useAuth';
import type { Lote } from './useLotes';

export interface DashboardStats {
  voluntariosAtivos: number;
  residuosColetados: number;
  lotesAndamento: number;
  lotesFinalizados: number;
  co2eEvitado: number;
  compostoProduzido: number;
}

export const useDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    voluntariosAtivos: 0,
    residuosColetados: 0,
    lotesAndamento: 0,
    lotesFinalizados: 0,
    co2eEvitado: 0,
    compostoProduzido: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Lote[]>([]);

  const { voluntarios } = useVoluntarios();
  const { entregas } = useEntregas();
  const { profile } = useAuth();

  const fetchLotes = async () => {
    if (!profile?.organization_code) return;
    
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLotes((data || []) as Lote[]);
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      setLotes([]);
    }
  };

  useEffect(() => {
    if (profile?.organization_code) {
      fetchLotes();
    }
  }, [profile]);

  useEffect(() => {
    const calculateStats = () => {
      // Voluntários ativos
      const voluntariosAtivos = voluntarios.filter(v => v.ativo).length;

      // Resíduos coletados - soma de todas as entregas validadas
      const residuosColetados = entregas
        .filter(e => e.geolocalizacao_validada)
        .reduce((total, entrega) => total + Number(entrega.peso), 0);

      // Lotes em andamento - status ativo em qualquer caixa da esteira (1-7)
      const lotesAndamento = lotes.filter(l => 
        l.status === 'ativo' && l.caixa_atual >= 1 && l.caixa_atual <= 7
      ).length;

      // Lotes finalizados - status encerrado
      const lotesFinalizados = lotes.filter(l => l.status === 'encerrado').length;

      // CO2e evitado - 0.766kg de CO2e por kg de resíduo
      const co2eEvitado = residuosColetados * 0.766;

      // Composto produzido - peso inicial dos lotes finalizados menos 22%
      const compostoProduzido = lotes
        .filter(l => l.status === 'encerrado')
        .reduce((total, lote) => total + (Number(lote.peso_inicial) || 0), 0) * 0.78;

      setStats({
        voluntariosAtivos,
        residuosColetados,
        lotesAndamento,
        lotesFinalizados,
        co2eEvitado,
        compostoProduzido,
      });

      setLoading(false);
    };

    calculateStats();
  }, [voluntarios, entregas, lotes]);

  return {
    stats,
    loading,
  };
};