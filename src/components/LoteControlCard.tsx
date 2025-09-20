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
  Loader2,
  X,
  Target
} from 'lucide-react';
import { useLotes } from '@/hooks/useLotes';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LoteControlCard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const { loteAtivoCaixa01, voluntariosCount, loading, criarNovoLote, cancelarLote, encerrarLote } = useLotes();
  const { profile, user } = useAuth();
  const orgData = useOrganizationData();
  const { toast } = useToast();

  const canCreateLote = profile?.user_role === 'super_admin' || profile?.user_role === 'local_admin';

  // Verifica se a esteira está completa (todas as caixas 1-7 ocupadas)
  const lotesAtivos = orgData.lotes?.filter(l => 
    (l.status === 'ativo' || l.status === 'em_processamento') && 
    l.caixa_atual >= 1 && l.caixa_atual <= 7
  ) || [];
  const isProductionBeltFull = lotesAtivos.length >= 7;
  
  // Verifica se o lote está na caixa 7 (pronto para finalização)
  const isLoteReadyForFinalization = loteAtivoCaixa01?.caixa_atual === 7;

  const handleCriarLote = async () => {
    if (!canCreateLote) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem criar novos lotes",
        variant: "destructive",
      });
      return;
    }

    if (isProductionBeltFull) {
      toast({
        title: "Esteira completa",
        description: "Todas as caixas da esteira estão ocupadas. Finalize um lote antes de criar outro.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await criarNovoLote();
      toast({
        title: "Lote criado",
        description: "Novo lote iniciado na Caixa 01",
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

  const handleCancelarLote = async () => {
    if (!loteAtivoCaixa01) return;

    setIsCanceling(true);
    try {
      const success = await cancelarLote(loteAtivoCaixa01.id);
      if (success) {
        toast({
          title: "Lote cancelado",
          description: "Lote e todas as entregas foram removidos",
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar lote:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleFinalizarLote = async () => {
    if (!loteAtivoCaixa01) return;

    setIsFinalizing(true);
    try {
      await encerrarLote(loteAtivoCaixa01.id);
      toast({
        title: "Lote finalizado",
        description: "Lote encerrado e adicionado à esteira de produção",
      });
    } catch (error) {
      console.error('Erro ao finalizar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o lote",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user || !profile) {
    return (
      <Card className="border-l-4 border-l-destructive">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              Usuário não autenticado
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Controle de Lote</span>
          </div>
          {loteAtivoCaixa01 ? (
            <Badge variant="default" className="bg-success text-success-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Inativo
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
                <h3 className="font-semibold">{loteAtivoCaixa01.codigo}</h3>
                <Badge variant="outline" className="font-mono text-xs">
                  Caixa {loteAtivoCaixa01.caixa_atual}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Scale className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <div className="font-medium text-xs">
                      {formatPesoDisplay(loteAtivoCaixa01.peso_atual)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Voluntários:</span>
                    <div className="font-medium">{voluntariosCount}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Iniciado:</span>
                    <div className="font-medium text-xs">
                      {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM', { locale: ptBR })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Semana:</span>
                    <div className="font-medium">{loteAtivoCaixa01.semana_atual}/8</div>
                  </div>
                </div>
              </div>

              {loteAtivoCaixa01.latitude && loteAtivoCaixa01.longitude && (
                <div className="flex items-start gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                  <div className="break-all">
                    <span className="text-muted-foreground">Localização:</span>
                    <div className="font-mono">
                      {Number(loteAtivoCaixa01.latitude).toFixed(4)}, {Number(loteAtivoCaixa01.longitude).toFixed(4)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controles do Lote */}
            {canCreateLote && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleCancelarLote}
                  disabled={isCanceling}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isCanceling ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  Cancelar
                </Button>
                
                {isLoteReadyForFinalization && (
                  <Button 
                    onClick={handleFinalizarLote}
                    disabled={isFinalizing}
                    size="sm"
                    className="flex-1"
                  >
                    {isFinalizing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Target className="h-3 w-3 mr-1" />
                    )}
                    Finalizar
                  </Button>
                )}
              </div>
            )}

            {/* Status do lote */}
            <div className="p-2 bg-success/10 rounded-md border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-success" />
                <span className="text-success text-xs font-medium">
                  {isLoteReadyForFinalization 
                    ? 'Lote pronto para finalização' 
                    : 'Lote ativo e recebendo entregas'
                  }
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sem Lote Ativo */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              
              <div>
                <h4 className="font-semibold text-muted-foreground">
                  Sistema Inativo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Nenhum lote ativo na Caixa 01
                </p>
              </div>

              {/* Status da esteira */}
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="text-xs text-muted-foreground">
                  Esteira: {lotesAtivos.length}/7 caixas ocupadas
                  {isProductionBeltFull && (
                    <div className="text-destructive font-medium mt-1">
                      Esteira completa - Finalize um lote primeiro
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de criar lote */}
              {canCreateLote && !isProductionBeltFull && (
                <Button 
                  onClick={handleCriarLote}
                  disabled={isCreating}
                  className="w-full"
                  size="sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-2" />
                      Iniciar Lote
                    </>
                  )}
                </Button>
              )}

              {!canCreateLote && (
                <div className="p-2 bg-destructive/10 rounded-md border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-destructive text-xs">
                      Apenas administradores podem criar lotes
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};