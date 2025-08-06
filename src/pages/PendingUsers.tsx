import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserApprovalModal } from '@/components/UserApprovalModal';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Users, Clock, UserCheck, RefreshCw } from 'lucide-react';

export default function PendingUsers() {
  const { pendingUsers, loading, approveUser, rejectUser, refreshPendingUsers } = useUserManagement();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Carregando usuários pendentes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Usuários Pendentes
          </h1>
          <p className="text-muted-foreground">
            Gerencie aprovações de novos usuários do sistema
          </p>
        </div>
        <Button 
          onClick={refreshPendingUsers}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum usuário pendente</h3>
            <p className="text-muted-foreground text-center">
              Todos os usuários cadastrados já foram aprovados ou rejeitados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {user.full_name || 'Usuário sem nome'}
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pendente
                    </Badge>
                  </CardTitle>
                  <Button
                    onClick={() => handleUserClick(user)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    Analisar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Organização</p>
                    <p>{user.organization_code}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Data do Cadastro</p>
                    <p>{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <Badge variant="outline" className="capitalize">
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserApprovalModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onApprove={approveUser}
        onReject={rejectUser}
      />
    </div>
  );
}