import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, Weight, CalendarDays, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLotes } from '@/hooks/useLotes';

export const LoteCard = () => {
  const { loteAtivoCaixa01, loading, criarNovoLote, encerrarLote } = useLotes();
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCriarLote = async () => {
    setIsCreating(true);
    await criarNovoLote();
    setIsCreating(false);
  };

  const handleEncerrarLote = async () => {
    if (!loteAtivoCaixa01) return;
    
    setIsClosing(true);
    await encerrarLote(loteAtivoCaixa01.id);
    setIsClosing(false);
  };

  const formatLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'Não disponível';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getDiasAteTransferencia = (dataTransferencia?: string) => {
    if (!dataTransferencia) return 0;
    const hoje = new Date();
    const transferencia = new Date(dataTransferencia);
    const diff = Math.ceil((transferencia.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado: Sem lote ativo na Caixa 01
  if (!loteAtivoCaixa01) {
    return (
      <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Play className="h-5 w-5" />
            Iniciar Novo Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-amber-700 dark:text-amber-300 mb-4 text-sm">
            Começe um novo lote de composto na Caixa 01 antes de receber resíduos dos voluntários.
          </p>
          <Button 
            onClick={handleCriarLote}
            disabled={isCreating}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isCreating ? 'Criando...' : 'Começar'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado: Com lote ativo na Caixa 01
  const diasAteTransferencia = getDiasAteTransferencia(loteAtivoCaixa01.data_proxima_transferencia);

  return (
    <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Weight className="h-5 w-5" />
            Lote Ativo - Caixa 01
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
            Semana {loteAtivoCaixa01.semana_atual}/7
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código do Lote */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
              Código do Lote
            </div>
            <div className="text-sm font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded border">
              {loteAtivoCaixa01.codigo}
            </div>
          </div>

          {/* Data/Hora de Início */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Iniciado em
            </div>
            <div className="text-sm">
              {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
            </div>
          </div>

          {/* Peso Total */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide flex items-center gap-1">
              <Weight className="h-3 w-3" />
              Peso Total
            </div>
            <div className="text-sm font-semibold">
              {loteAtivoCaixa01.peso_atual.toFixed(2)} kg
            </div>
          </div>

          {/* Próxima Transferência */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Próxima Transferência
            </div>
            <div className="text-sm">
              {diasAteTransferencia === 0 ? (
                <span className="text-orange-600 font-medium">Hoje</span>
              ) : diasAteTransferencia === 1 ? (
                <span className="text-amber-600 font-medium">Amanhã</span>
              ) : (
                <span>Em {diasAteTransferencia} dias</span>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Localização
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {formatLocation(loteAtivoCaixa01.latitude, loteAtivoCaixa01.longitude)}
            </div>
          </div>

          {/* Criador */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado por
            </div>
            <div className="text-sm">
              {loteAtivoCaixa01.criado_por_nome}
            </div>
          </div>
        </div>

        {/* Botão Encerrar */}
        <div className="pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isClosing}
              >
                {isClosing ? 'Encerrando...' : 'Encerrar Lote'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar Lote</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja encerrar o lote <strong>{loteAtivoCaixa01.codigo}</strong>?
                  <br /><br />
                  Esta ação é <strong>irreversível</strong> e o lote não poderá mais receber novos resíduos.
                  O peso total atual é de <strong>{loteAtivoCaixa01.peso_atual.toFixed(2)} kg</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleEncerrarLote}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Encerrar Definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};