import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export const useVoluntarios = () => {
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVoluntarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voluntarios')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
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
      const { data: newVoluntario, error } = await supabase
        .from('voluntarios')
        .insert([data])
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
      
      let message = "Erro ao cadastrar voluntário";
      if (error?.code === '23505') {
        if (error.detail?.includes('cpf')) {
          message = "CPF já cadastrado";
        } else if (error.detail?.includes('numero_balde')) {
          message = "Número do balde já está em uso nesta unidade";
        }
      }
      
      toast({
        title: "Erro",
        description: message,
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
      
      let message = "Erro ao atualizar voluntário";
      if (error?.code === '23505') {
        if (error.detail?.includes('cpf')) {
          message = "CPF já cadastrado";
        } else if (error.detail?.includes('numero_balde')) {
          message = "Número do balde já está em uso nesta unidade";
        }
      }
      
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const deleteVoluntario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('voluntarios')
        .update({ ativo: false })
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
    fetchVoluntarios();
  }, []);

  return {
    voluntarios,
    loading,
    createVoluntario,
    updateVoluntario,
    deleteVoluntario,
    refetch: fetchVoluntarios,
  };
};