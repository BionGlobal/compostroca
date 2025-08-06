import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, TreePine } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-emerald-600 p-3 rounded-full">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-emerald-700">Verificando autenticação...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md px-6">
          <div className="bg-amber-500 p-3 rounded-full">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-emerald-800">Aguardando Aprovação</h2>
            <p className="text-emerald-700">
              Seu cadastro foi realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.
            </p>
            <p className="text-sm text-emerald-600">
              Você receberá uma notificação quando sua conta for aprovada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md px-6">
          <div className="bg-red-500 p-3 rounded-full">
            <TreePine className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-emerald-800">Acesso Negado</h2>
            <p className="text-emerald-700">
              Seu cadastro foi rejeitado pelo administrador. Entre em contato para mais informações.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};