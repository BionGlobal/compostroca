import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Scale, 
  Users, 
  Calendar, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useLotes } from '@/hooks/useLotes';
import { useAuth } from '@/hooks/useAuth';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LoteActiveCard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { loteAtivoCaixa01, voluntariosCount, loading, criarNovoLote } = useLotes();
  const { profile } = useAuth();
  const { toast } = useToast();

  const canCreateLote = profile?.user_role === 'super_admin' || profile?.user_role === 'local_admin';

  const handleCriarLote = async () => {
    if (!canCreateLote) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem criar novos lotes",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await criarNovoLote();
      toast({
        title: "Sucesso!",
        description: "Novo lote criado na Caixa 01",
      });
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o novo lote",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando lote ativo...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${loteAtivoCaixa01 ? 'border-l-green-500' : 'border-l-orange-500'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Lote Ativo - Caixa 01</span>
          </div>
          {loteAtivoCaixa01 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loteAtivoCaixa01 ? (
          <>
            {/* Informações do Lote Ativo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{loteAtivoCaixa01.codigo}</h3>
                <Badge variant="outline" className="font-mono">
                  {loteAtivoCaixa01.unidade}{loteAtivoCaixa01.linha_producao}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <div className="font-medium">
                      {formatPesoDisplay(loteAtivoCaixa01.peso_atual)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Voluntários:</span>
                    <div className="font-medium">{voluntariosCount}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Iniciado:</span>
                    <div className="font-medium">
                      {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Semana:</span>
                    <div className="font-medium">{loteAtivoCaixa01.semana_atual}/8</div>
                  </div>
                </div>
              </div>

              {loteAtivoCaixa01.latitude && loteAtivoCaixa01.longitude && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Localização:</span>
                    <div className="font-medium text-xs break-all">
                      {Number(loteAtivoCaixa01.latitude).toFixed(6)}, {Number(loteAtivoCaixa01.longitude).toFixed(6)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status atual */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-800 dark:text-green-200 font-medium text-sm">
                  Lote ativo e pronto para receber entregas
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sem Lote Ativo */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Nenhum lote ativo na Caixa 01
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    É necessário iniciar um novo lote para começar a receber entregas de resíduos orgânicos.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão para Criar Novo Lote */}
            {canCreateLote && (
              <Button 
                onClick={handleCriarLote}
                disabled={isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando Lote...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Iniciar Novo Lote
                  </>
                )}
              </Button>
            )}

            {!canCreateLote && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Apenas administradores podem criar novos lotes
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};