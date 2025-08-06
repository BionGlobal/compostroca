import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export const AdminRoute = ({ children, requireSuperAdmin = false }: AdminRouteProps) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-5 w-5 animate-pulse" />
          Verificando permissões...
        </div>
      </div>
    );
  }

  if (!profile || profile.status !== 'approved') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Acesso negado. Usuário não autorizado.
        </AlertDescription>
      </Alert>
    );
  }

  if (requireSuperAdmin && profile.user_role !== 'super_admin') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Acesso restrito. Apenas super administradores podem acessar esta área.
        </AlertDescription>
      </Alert>
    );
  }

  if (!requireSuperAdmin && !['super_admin', 'local_admin'].includes(profile.user_role)) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Acesso restrito. Permissões administrativas necessárias.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};