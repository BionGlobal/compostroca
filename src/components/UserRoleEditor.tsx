import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Settings, Eye, AlertTriangle } from 'lucide-react';
import { ApprovedUser } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';

type UserRole = 'super_admin' | 'local_admin' | 'auditor';

interface UserRoleEditorProps {
  user: ApprovedUser;
  onRoleUpdate: (userId: string, newRole: UserRole) => Promise<boolean>;
}

export const UserRoleEditor = ({ user, onRoleUpdate }: UserRoleEditorProps) => {
  const { profile } = useAuth();
  const [newRole, setNewRole] = useState<UserRole>(user.user_role as UserRole);
  const [isLoading, setIsLoading] = useState(false);

  const isSuperAdmin = profile?.user_role === 'super_admin';
  const isOwnProfile = profile?.user_id === user.user_id;
  const hasChanges = newRole !== user.user_role;

  // Não permite que Super Admins alterem seu próprio papel
  if (!isSuperAdmin || isOwnProfile) {
    return null;
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'local_admin':
        return <Settings className="h-4 w-4 text-primary" />;
      case 'auditor':
        return <Eye className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
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

  const handleConfirmRoleChange = async () => {
    if (!hasChanges) return;

    setIsLoading(true);
    const success = await onRoleUpdate(user.user_id, newRole);
    setIsLoading(false);

    if (!success) {
      // Reverte a mudança em caso de erro
      setNewRole(user.user_role as UserRole);
    }
  };

  const isCriticalChange = newRole === 'super_admin' || user.user_role === 'super_admin';

  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <h4 className="font-medium mb-4 flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        Gerenciar Papel do Usuário
      </h4>

      <div className="space-y-4">
        {/* Papel Atual */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Papel atual:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            {getRoleIcon(user.user_role)}
            {getRoleLabel(user.user_role)}
          </Badge>
        </div>

        {/* Seletor de Novo Papel */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Novo papel:</label>
          <Select value={newRole} onValueChange={(value: UserRole) => setNewRole(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auditor">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Auditor</div>
                    <div className="text-xs text-muted-foreground">Apenas visualização</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="local_admin">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Administrador Local</div>
                    <div className="text-xs text-muted-foreground">Pode modificar dados</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="super_admin">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive" />
                  <div>
                    <div className="font-medium">Super Administrador</div>
                    <div className="text-xs text-muted-foreground">Acesso total</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Descrição do papel selecionado */}
          <p className="text-xs text-muted-foreground">
            {getRoleDescription(newRole)}
          </p>
        </div>

        {/* Botão de confirmação */}
        {hasChanges && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                variant={isCriticalChange ? "destructive" : "default"}
                disabled={isLoading}
              >
                {isCriticalChange && <AlertTriangle className="h-4 w-4 mr-2" />}
                {isLoading ? 'Atualizando...' : 'Atualizar Papel'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {isCriticalChange && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  Confirmar alteração de papel
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    Você está prestes a alterar o papel de <strong>{user.full_name || 'Usuário'}</strong> de{' '}
                    <strong>{getRoleLabel(user.user_role)}</strong> para{' '}
                    <strong>{getRoleLabel(newRole)}</strong>.
                  </p>
                  {isCriticalChange && (
                    <p className="text-destructive font-medium">
                      ⚠️ Esta é uma alteração crítica que pode afetar significativamente as permissões do usuário.
                    </p>
                  )}
                  <p>Esta ação não pode ser desfeita facilmente. Tem certeza?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmRoleChange}
                  className={isCriticalChange ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  Confirmar Alteração
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};