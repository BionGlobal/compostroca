import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { ApprovedUser } from '@/hooks/useUserManagement';
import { Eye, Shield, Settings, Users, RefreshCw } from 'lucide-react';

interface ApprovedUsersListProps {
  users: ApprovedUser[];
  loading: boolean;
  onRefresh: () => void;
  onViewActivities: (userId: string) => void;
}

export const ApprovedUsersList = ({ 
  users, 
  loading, 
  onRefresh, 
  onViewActivities 
}: ApprovedUsersListProps) => {
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUserClick = (user: ApprovedUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Usuários Aprovados</h2>
          <p className="text-muted-foreground text-sm">
            {users.length} usuário{users.length !== 1 ? 's' : ''} ativo{users.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>
        <Button 
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
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
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {user.full_name || 'Usuário sem nome'}
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getRoleIcon(user.user_role)}
                      {getRoleLabel(user.user_role)}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onViewActivities(user.user_id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Atividades
                    </Button>
                    <Button
                      onClick={() => handleUserClick(user)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Organização</p>
                    <p>{user.organization_code}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Unidades Autorizadas</p>
                    <p>{user.authorized_units?.join(', ') || 'Nenhuma'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Aprovado em</p>
                    <p>{user.approved_at ? new Date(user.approved_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant="default" className="capitalize">
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
      />
    </div>
  );
};