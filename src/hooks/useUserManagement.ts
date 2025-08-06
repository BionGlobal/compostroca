import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingUser {
  id: string;
  user_id: string;
  full_name: string | null;
  organization_code: string;
  user_role: 'super_admin' | 'local_admin' | 'auditor';
  status: 'pending' | 'approved' | 'rejected';
  authorized_units: string[];
  created_at: string;
}

export const useUserManagement = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários pendentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários pendentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (
    userId: string, 
    role: 'local_admin' | 'auditor', 
    authorizedUnits: string[]
  ) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'approved',
          user_role: role,
          authorized_units: authorizedUnits,
          approved_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Usuário aprovado",
        description: "Usuário aprovado com sucesso!",
      });

      await fetchPendingUsers();
      return true;
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Usuário rejeitado",
        description: "Usuário rejeitado com sucesso.",
      });

      await fetchPendingUsers();
      return true;
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  return {
    pendingUsers,
    loading,
    approveUser,
    rejectUser,
    refreshPendingUsers: fetchPendingUsers,
  };
};