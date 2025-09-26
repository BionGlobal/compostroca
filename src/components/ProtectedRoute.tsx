import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, profile, signOut } = useAuth();
  const { reapplyUser } = useUserManagement();

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-foreground">
          <img src="/lovable-uploads/bion-logo1.png" alt="Bion" className="h-12 w-12" />
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="opacity-80">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Verificar se usuário está aprovado
  if (profile && profile.status === 'pending') {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md px-6 text-foreground">
          <img src="/lovable-uploads/bion-logo1.png" alt="Bion" className="h-12 w-12" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Aguardando Aprovação</h2>
            <p className="opacity-90">
              Seu cadastro foi realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.
            </p>
            <p className="text-sm opacity-70">
              Você receberá uma notificação quando sua conta for aprovada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.status === 'rejected') {
    const handleReapply = async () => {
      if (profile?.user_id) {
        const success = await reapplyUser(profile.user_id);
        if (success) {
          await signOut();
        }
      }
    };

    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center space-y-6 text-center max-w-sm w-full text-foreground">
          <img src="/lovable-uploads/bion-logo1.png" alt="Bion" className="h-12 w-12" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Acesso Rejeitado</h2>
              <p className="text-sm opacity-90 leading-relaxed">
                Seu cadastro foi rejeitado pelo administrador. Você pode tentar se candidatar novamente com informações atualizadas.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <Button 
              onClick={handleReapply}
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Reenviar Solicitação
            </Button>
            
            <Button 
              onClick={signOut}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Fazer Logout
            </Button>
          </div>

          <p className="text-xs opacity-70 mt-4">
            Ao reenviar, você será redirecionado para fazer um novo cadastro.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};