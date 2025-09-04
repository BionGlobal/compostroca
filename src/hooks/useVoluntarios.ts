import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Voluntario {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  numero_balde: number;
  unidade: string;
  foto_url?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export const useVoluntarios = () => {
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchVoluntarios = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching voluntários...');
      
      const { data, error } = await supabase
        .from('voluntarios')
        .select('*')
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome');

      if (error) {
        console.error('❌ Error fetching voluntários:', error);
        throw error;
      }
      
      console.log('✅ Voluntários fetched:', data?.length, 'items');
      setVoluntarios(data || []);
    } catch (error) {
      console.error('Erro ao buscar voluntários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os voluntários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createVoluntario = async (data: Omit<Voluntario, 'id' | 'created_at' | 'updated_at' | 'ativo'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: newVoluntario, error } = await supabase
        .from('voluntarios')
        .insert([{ ...data, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setVoluntarios(prev => [...prev, newVoluntario]);
      toast({
        title: "Sucesso",
        description: "Voluntário cadastrado com sucesso!",
      });
      
      return newVoluntario;
    } catch (error: any) {
      console.error('Erro ao criar voluntário:', error);
      
      toast({
        title: "Erro",
        description: "Erro ao cadastrar voluntário",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const updateVoluntario = async (id: string, data: Partial<Voluntario>) => {
    try {
      const { data: updatedVoluntario, error } = await supabase
        .from('voluntarios')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setVoluntarios(prev => 
        prev.map(v => v.id === id ? updatedVoluntario : v)
      );
      
      toast({
        title: "Sucesso",
        description: "Voluntário atualizado com sucesso!",
      });
      
      return updatedVoluntario;
    } catch (error: any) {
      console.error('Erro ao atualizar voluntário:', error);
      
      toast({
        title: "Erro",
        description: "Erro ao atualizar voluntário",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const deleteVoluntario = async (id: string) => {
    try {
      // Implementar soft delete
      const { error } = await supabase
        .from('voluntarios')
        .update({ 
          ativo: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setVoluntarios(prev => prev.filter(v => v.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Voluntário removido com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover voluntário:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover voluntário",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchVoluntarios();
    }
  }, [user]);

  return {
    voluntarios,
    loading,
    createVoluntario,
    updateVoluntario,
    deleteVoluntario,
    refetch: fetchVoluntarios,
  };
};