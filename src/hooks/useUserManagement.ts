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

export interface ApprovedUser extends PendingUser {
  approved_at: string;
  approved_by: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action_type: string;
  action_description: string;
  table_affected: string | null;
  record_id: string | null;
  created_at: string;
}

export const useUserManagement = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
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

  const fetchApprovedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setApprovedUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários aprovados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários aprovados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async (userId?: string) => {
    try {
      setActivitiesLoading(true);
      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUserActivities(data || []);
    } catch (error) {
      console.error('Erro ao buscar atividades do usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar atividades do usuário",
        variant: "destructive",
      });
    } finally {
      setActivitiesLoading(false);
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
      await fetchApprovedUsers();
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
      await fetchApprovedUsers();
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
    fetchApprovedUsers();
  }, []);

  return {
    pendingUsers,
    approvedUsers,
    userActivities,
    loading,
    activitiesLoading,
    approveUser,
    rejectUser,
    fetchUserActivities,
    refreshPendingUsers: fetchPendingUsers,
    refreshApprovedUsers: fetchApprovedUsers,
  };
};