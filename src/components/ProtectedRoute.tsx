import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, profile } = useAuth();

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
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md px-6 text-foreground">
          <img src="/lovable-uploads/bion-logo1.png" alt="Bion" className="h-12 w-12" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Acesso Negado</h2>
            <p className="opacity-90">
              Seu cadastro foi rejeitado pelo administrador. Entre em contato para mais informações.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};