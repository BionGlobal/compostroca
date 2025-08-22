import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ApprovedUser } from '@/hooks/useUserManagement';
import { UserRoleEditor } from '@/components/UserRoleEditor';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Settings, Eye, Users, Calendar, MapPin } from 'lucide-react';

interface UserDetailsModalProps {
  user: ApprovedUser | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdate?: (userId: string, newRole: 'super_admin' | 'local_admin' | 'auditor') => Promise<boolean>;
}

export const UserDetailsModal = ({ user, isOpen, onClose, onRoleUpdate }: UserDetailsModalProps) => {
  const { profile } = useAuth();
  
  if (!user) return null;

  const isSuperAdmin = profile?.user_role === 'super_admin';
  const isOwnProfile = profile?.user_id === user.user_id;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'local_admin':
        return <Settings className="h-4 w-4 text-primary" />;
      case 'auditor':
        return <Eye className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrador';
      case 'local_admin':
        return 'Administrador Local';
      case 'auditor':
        return 'Auditor';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Acesso total ao sistema, pode gerenciar usuários e todas as funcionalidades';
      case 'local_admin':
        return 'Acesso completo às unidades autorizadas, pode modificar dados';
      case 'auditor':
        return 'Apenas visualização, sem poder modificar dados';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Detalhes do Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.full_name || 'Usuário sem nome'}</h3>
                <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Organização</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.organization_code}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="default" className="capitalize">
                  {user.status === 'approved' ? 'Aprovado' : user.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nível de Acesso */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              {getRoleIcon(user.user_role)}
              Nível de Acesso
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getRoleIcon(user.user_role)}
                  {getRoleLabel(user.user_role)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {getRoleDescription(user.user_role)}
              </p>
            </div>
          </div>

          {/* Unidades Autorizadas */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Unidades Autorizadas</p>
            <div className="flex flex-wrap gap-2">
              {user.authorized_units?.map((unit) => (
                <Badge key={unit} variant="secondary">
                  {unit}
                </Badge>
              )) || <span className="text-sm text-muted-foreground">Nenhuma unidade autorizada</span>}
            </div>
          </div>

          {/* Gerenciamento de Papel (apenas para Super Admins) */}
          {isSuperAdmin && !isOwnProfile && onRoleUpdate && (
            <UserRoleEditor 
              user={user} 
              onRoleUpdate={onRoleUpdate}
            />
          )}

          {/* Datas Importantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Cadastro
              </p>
              <p className="text-sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
            </div>

            {user.approved_at && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Aprovação
                </p>
                <p className="text-sm">{new Date(user.approved_at).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};