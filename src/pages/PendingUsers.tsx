import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserApprovalModal } from '@/components/UserApprovalModal';
import { ApprovedUsersList } from '@/components/ApprovedUsersList';
import { UserActivityLog } from '@/components/UserActivityLog';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Users, Clock, UserCheck, RefreshCw, Activity } from 'lucide-react';

export default function PendingUsers() {
  const { profile } = useAuth();
  const { 
    pendingUsers, 
    approvedUsers, 
    userActivities,
    loading, 
    activitiesLoading,
    approveUser, 
    rejectUser, 
    deleteUser,
    fetchUserActivities,
    refreshPendingUsers,
    refreshApprovedUsers
  } = useUserManagement();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const isSuperAdmin = profile?.user_role === 'super_admin';

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
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie usuários pendentes, aprovados e monitore atividades do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="pending" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pendentes</span>
            <span className="sm:hidden">Pend.</span>
            <span className="text-xs">({pendingUsers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Aprovados</span>
            <span className="sm:hidden">Aprov.</span>
            <span className="text-xs">({approvedUsers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Atividades</span>
            <span className="sm:hidden">Ativ.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 md:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg md:text-xl font-semibold">Usuários Pendentes</h2>
            <Button 
              onClick={refreshPendingUsers}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
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
            <div className="grid gap-3 md:gap-4">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 md:pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-2">
                        <CardTitle className="text-base md:text-lg flex flex-wrap items-center gap-2">
                          {user.full_name || 'Usuário sem nome'}
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            Pendente
                          </Badge>
                        </CardTitle>
                      </div>
                      <Button
                        onClick={() => handleUserClick(user)}
                        size="sm"
                        className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                        Analisar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 text-xs sm:text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Organização</p>
                        <p className="break-all">{user.organization_code}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Data do Cadastro</p>
                        <p>{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <p className="font-medium text-muted-foreground">Status</p>
                        <Badge variant="outline" className="capitalize text-xs">
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
            onDeleteUser={isSuperAdmin ? deleteUser : undefined}
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