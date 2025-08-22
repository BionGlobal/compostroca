import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { ApprovedUser } from '@/hooks/useUserManagement';
import { Eye, Shield, Settings, Users, RefreshCw, Trash2 } from 'lucide-react';

interface ApprovedUsersListProps {
  users: ApprovedUser[];
  loading: boolean;
  onRefresh: () => void;
  onViewActivities: (userId: string) => void;
  onDeleteUser?: (userId: string) => Promise<boolean>;
  onRoleUpdate?: (userId: string, newRole: 'super_admin' | 'local_admin' | 'auditor') => Promise<boolean>;
}

export const ApprovedUsersList = ({ 
  users, 
  loading, 
  onRefresh, 
  onViewActivities, 
  onDeleteUser,
  onRoleUpdate 
}: ApprovedUsersListProps) => {
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUserClick = (user: ApprovedUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!onDeleteUser) return;
    
    setIsDeleting(true);
    try {
      const success = await onDeleteUser(userId);
      if (success) {
        onRefresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
        return 'Super Admin';
      case 'local_admin':
        return 'Admin Local';
      case 'auditor':
        return 'Auditor';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Carregando usuários aprovados...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">Usuários Aprovados</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {users.length} usuário{users.length !== 1 ? 's' : ''} ativo{users.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>
        <Button 
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-xs sm:text-sm"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          Atualizar
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum usuário aprovado</h3>
            <p className="text-muted-foreground text-center">
              Não há usuários aprovados no sistema ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-base md:text-lg flex flex-wrap items-center gap-2">
                      {user.full_name || 'Usuário sem nome'}
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        {getRoleIcon(user.user_role)}
                        {getRoleLabel(user.user_role)}
                      </Badge>
                    </CardTitle>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => onViewActivities(user.user_id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      Atividades
                    </Button>
                    <Button
                      onClick={() => handleUserClick(user)}
                      size="sm"
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      Detalhes
                    </Button>
                    {onDeleteUser && user.user_role !== 'super_admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2 text-xs sm:text-sm"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o usuário "{user.full_name || 'Usuário sem nome'}"? 
                              Esta ação irá desativar o acesso do usuário ao sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Excluindo...' : 'Excluir'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Organização</p>
                    <p className="break-all">{user.organization_code}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Unidades Autorizadas</p>
                    <p className="break-all text-xs">{user.authorized_units?.join(', ') || 'Nenhuma'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Aprovado em</p>
                    <p>{user.approved_at ? new Date(user.approved_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant="default" className="capitalize text-xs">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserDetailsModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRoleUpdate={onRoleUpdate}
      />
    </div>
  );
};