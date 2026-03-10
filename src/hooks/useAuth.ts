import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  organization_code: string;
  role: string;
  user_role: 'super_admin' | 'local_admin' | 'auditor';
  status: 'pending' | 'approved' | 'rejected';
  authorized_units: string[];
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('👤 Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        throw error;
      }
      
      console.log('✅ Profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Conta criada com sucesso!",
        description: "Você pode fazer login agora.",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      let message = "Erro ao criar conta";
      if (error?.message?.includes('User already registered')) {
        message = "Este email já possui uma conta. Tente fazer login ou use 'Esqueci minha senha' para recuperar o acesso.";
      }
      
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      let message = "Erro ao fazer login";
      if (error?.message?.includes('Invalid login credentials')) {
        message = "Email ou senha incorretos";
      }
      
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      
      return { data: null, error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = 'https://compostroca.bion.global/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email de recuperação. Verifique o endereço informado.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 Iniciando logout...');
      
      // Verificar se há sessão ativa antes de tentar logout
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('⚠️ Nenhuma sessão ativa, limpando estado local');
        // Limpar estado local mesmo sem sessão ativa
        setSession(null);
        setUser(null);
        setProfile(null);
        localStorage.removeItem('supabase.auth.token');
        
        toast({
          title: "Logout realizado",
          description: "Sessão encerrada com sucesso",
        });
        return;
      }

      // Tentar logout com retry
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { error } = await supabase.auth.signOut();
          
          if (!error) {
            console.log('✅ Logout realizado com sucesso');
            toast({
              title: "Logout realizado com sucesso!",
              description: "Até logo!",
            });
            return;
          }
          
          // Se erro específico de sessão não encontrada, tratar como sucesso
          if (error.message?.includes('Session not found') || error.message?.includes('session id')) {
            console.log('⚠️ Sessão já era inválida, limpando estado local');
            setSession(null);
            setUser(null);
            setProfile(null);
            localStorage.removeItem('supabase.auth.token');
            
            toast({
              title: "Logout realizado",
              description: "Sessão encerrada com sucesso",
            });
            return;
          }
          
          throw error;
          
        } catch (attemptError: any) {
          attempts++;
          console.error(`❌ Tentativa ${attempts} de logout falhou:`, attemptError);
          
          if (attempts >= maxAttempts) {
            // Último recurso: limpar estado local
            console.log('🔧 Forçando limpeza local após falhas no logout');
            setSession(null);
            setUser(null);
            setProfile(null);
            localStorage.removeItem('supabase.auth.token');
            
            toast({
              title: "Logout forçado",
              description: "Sessão encerrada localmente",
              variant: "destructive",
            });
            return;
          }
          
          // Aguardar antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
    } catch (error: any) {
      console.error('💥 Erro crítico no logout:', error);
      
      // Fallback: limpar estado local sempre
      setSession(null);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('supabase.auth.token');
      
      toast({
        title: "Erro no logout",
        description: "Sessão encerrada localmente devido a erro",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  };
};