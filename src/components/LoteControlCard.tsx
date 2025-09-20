import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, User } from 'lucide-react';
import { useLotes } from '@/hooks/useLotes';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { formatLocation } from '@/lib/organizationUtils';
import { useToast } from '@/hooks/use-toast';

export const LoteControlCard = () => {
  const { loteAtivoCaixa01, criarNovoLote, cancelarLote, encerrarLote } = useLotes();
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

  const handleIniciarLote = async () => {
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

    try {
      await criarNovoLote();
      toast({
        title: "Sucesso",
        description: "Novo lote criado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o lote",
        variant: "destructive",
      });
    }
  };

  const handleCancelarLote = async () => {
    if (!loteAtivoCaixa01) return;
    
    try {
      await cancelarLote(loteAtivoCaixa01.id);
      toast({
        title: "Sucesso",
        description: "Lote cancelado e apagado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao cancelar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o lote",
        variant: "destructive",
      });
    }
  };

  const handleFinalizarLote = async () => {
    if (!loteAtivoCaixa01) return;
    
    try {
      await encerrarLote(loteAtivoCaixa01.id);
      toast({
        title: "Sucesso",
        description: "Lote finalizado e enviado para a caixa 1 da esteira!",
      });
    } catch (error) {
      console.error('Erro ao finalizar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o lote",
        variant: "destructive",
      });
    }
  };

  // Determinar se o botão deve estar desabilitado e a mensagem
  const isDisabled = !canCreateLote || isProductionBeltFull;
  const getDisabledMessage = () => {
    if (!canCreateLote) return "Apenas administradores podem criar lotes";
    if (isProductionBeltFull) return "Esteira completa - finalize um lote antes de criar outro";
    return "";
  };

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">
          Novo Lote
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!loteAtivoCaixa01 ? (
          // Estado inicial - apenas botão "Iniciar Lote"
          <div className="space-y-2">
            <Button
              onClick={handleIniciarLote}
              className="w-full"
              size="sm"
              disabled={isDisabled}
            >
              Iniciar Lote
            </Button>
            {isDisabled && (
              <p className="text-xs text-muted-foreground text-center">
                {getDisabledMessage()}
              </p>
            )}
          </div>
        ) : (
          // Estado expandido - mostrar informações do lote e controles
          <div className="space-y-4">
            {/* Informações do lote */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">Código</span>
                <p className="font-medium text-foreground">{loteAtivoCaixa01.codigo}</p>
              </div>
              
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Criado em
                </span>
                <p className="font-medium text-foreground text-xs">
                  {new Date(loteAtivoCaixa01.data_inicio).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Localização
                </span>
                <p className="font-medium text-foreground text-xs">
                  {formatLocation(loteAtivoCaixa01.latitude, loteAtivoCaixa01.longitude)}
                </p>
              </div>
              
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Criador
                </span>
                <p className="font-medium text-foreground text-xs">
                  {loteAtivoCaixa01.criado_por_nome}
                </p>
              </div>
            </div>

            {/* Botões de controle */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelarLote}
                className="flex-1"
              >
                Cancelar Lote
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleFinalizarLote}
                className="flex-1"
              >
                Finalizar Lote
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};