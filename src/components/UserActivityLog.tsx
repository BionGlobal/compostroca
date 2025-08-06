import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserActivity } from '@/hooks/useUserManagement';
import { Activity, Calendar, Database, RefreshCw, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserActivityLogProps {
  activities: UserActivity[];
  loading: boolean;
  onRefresh: () => void;
  selectedUserId?: string;
}

export const UserActivityLog = ({ 
  activities, 
  loading, 
  onRefresh, 
  selectedUserId 
}: UserActivityLogProps) => {
  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'login':
        return <User className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <User className="h-4 w-4 text-gray-500" />;
      case 'create':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'update':
        return <Database className="h-4 w-4 text-yellow-500" />;
      case 'delete':
        return <Database className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (actionType.toLowerCase()) {
      case 'login':
        return 'default';
      case 'logout':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Carregando atividades...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Log de Atividades
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedUserId ? 'Atividades do usuário selecionado' : 'Últimas 50 atividades do sistema'}
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

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma atividade registrada</h3>
            <p className="text-muted-foreground text-center">
              Não há atividades registradas para exibir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(activity.action_type)}
                  </div>
                  
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionVariant(activity.action_type)} className="text-xs">
                          {activity.action_type}
                        </Badge>
                        {activity.table_affected && (
                          <Badge variant="outline" className="text-xs">
                            {activity.table_affected}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </div>
                    </div>
                    
                    <p className="text-sm">{activity.action_description}</p>
                    
                    {activity.record_id && (
                      <p className="text-xs text-muted-foreground">
                        ID do registro: {activity.record_id}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};