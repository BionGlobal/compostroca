import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserApprovalModal } from '@/components/UserApprovalModal';
import { ApprovedUsersList } from '@/components/ApprovedUsersList';
import { UserActivityLog } from '@/components/UserActivityLog';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Users, Clock, UserCheck, RefreshCw, Activity } from 'lucide-react';

export default function PendingUsers() {
  const { 
    pendingUsers, 
    approvedUsers, 
    userActivities,
    loading, 
    activitiesLoading,
    approveUser, 
    rejectUser, 
    fetchUserActivities,
    refreshPendingUsers,
    refreshApprovedUsers
  } = useUserManagement();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleViewActivities = (userId: string) => {
    setSelectedUserId(userId);
    fetchUserActivities(userId);
  };

  const handleRefreshAllActivities = () => {
    fetchUserActivities();
    setSelectedUserId(undefined);
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
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie usuários pendentes, aprovados e monitore atividades do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="pending" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <Clock className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Pendentes</span>
            <span className="text-xs">({pendingUsers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <UserCheck className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Aprovados</span>
            <span className="text-xs">({approvedUsers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
            <Activity className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Atividades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">Usuários Pendentes</h2>
            <Button 
              onClick={refreshPendingUsers}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Carregando usuários pendentes...
              </div>
            </div>
          ) : pendingUsers.length === 0 ? (
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
            <div className="grid gap-3 sm:gap-4">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <CardTitle className="text-base sm:text-lg">
                          {user.full_name || 'Usuário sem nome'}
                        </CardTitle>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleUserClick(user)}
                        size="sm"
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <UserCheck className="h-4 w-4" />
                        Analisar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Organização</p>
                        <p className="break-all">{user.organization_code}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Data do Cadastro</p>
                        <p>{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Status</p>
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
        </TabsContent>

        <TabsContent value="approved">
          <ApprovedUsersList
            users={approvedUsers}
            loading={loading}
            onRefresh={refreshApprovedUsers}
            onViewActivities={handleViewActivities}
          />
        </TabsContent>

        <TabsContent value="activities">
          <UserActivityLog
            activities={userActivities}
            loading={activitiesLoading}
            onRefresh={handleRefreshAllActivities}
            selectedUserId={selectedUserId}
          />
        </TabsContent>
      </Tabs>

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