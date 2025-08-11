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
      // Voluntários ativos - total de voluntários cadastrados ativos (não contar soft delete)
      const voluntariosAtivos = voluntarios.filter(v => v.ativo).length;

      // Resíduos em toneladas - soma do peso atual de todos os lotes (na esteira e finalizados)
      const residuosColetados = lotes
        .reduce((total, lote) => total + (Number(lote.peso_atual) || 0), 0) / 1000; // converter para toneladas

      // Lotes em andamento - status ativo ou em_processamento na esteira (1-7)
      const lotesAndamento = lotes.filter(l => 
        (l.status === 'ativo' || l.status === 'em_processamento') && 
        l.caixa_atual >= 1 && l.caixa_atual <= 7
      ).length;

      // Lotes finalizados - status encerrado
      const lotesFinalizados = lotes.filter(l => l.status === 'encerrado').length;

      // CO2e evitado em toneladas - peso atual de todos os lotes * 0.766 (estudo Embrapa)
      const co2eEvitado = (lotes
        .reduce((total, lote) => total + (Number(lote.peso_atual) || 0), 0) * 0.766) / 1000; // converter para toneladas

      // Composto produzido em toneladas - peso atual dos lotes finalizados
      const compostoProduzido = lotes
        .filter(l => l.status === 'encerrado')
        .reduce((total, lote) => total + (Number(lote.peso_atual) || 0), 0) / 1000; // converter para toneladas

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