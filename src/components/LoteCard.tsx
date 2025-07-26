import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, Weight, Users, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLotes } from '@/hooks/useLotes';

export const LoteCard = () => {
  const { loteAtivoCaixa01, voluntariosCount, loading, criarNovoLote, encerrarLote } = useLotes();
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
      <Card className="mb-6 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200/50 dark:border-amber-700/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <Play className="h-5 w-5" />
            Iniciar Novo Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-amber-800 dark:text-amber-200 mb-6 text-sm leading-relaxed">
            Começe um novo lote de composto na Caixa 01 antes de receber resíduos dos voluntários.
          </p>
          <Button 
            onClick={handleCriarLote}
            disabled={isCreating}
            className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white shadow-md"
          >
            {isCreating ? 'Criando...' : 'Começar'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado: Com lote ativo na Caixa 01
  return (
    <Card className="mb-6 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 border-green-200/50 dark:border-green-700/50 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <Weight className="h-5 w-5" />
            Lote Ativo - Caixa 01
          </CardTitle>
          <Badge variant="secondary" className="bg-green-200/80 text-green-900 dark:bg-green-800/50 dark:text-green-100 border-green-300 dark:border-green-600 w-fit">
            Semana {loteAtivoCaixa01.semana_atual}/7
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Código do Lote */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide">
              Código do Lote
            </div>
            <div className="text-sm font-mono bg-white/70 dark:bg-black/30 px-3 py-2 rounded-md border border-green-300/50 dark:border-green-600/50 text-green-900 dark:text-green-100">
              {loteAtivoCaixa01.codigo}
            </div>
          </div>

          {/* Data/Hora de Início */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Iniciado em
            </div>
            <div className="text-sm text-green-900 dark:text-green-100">
              {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
            </div>
          </div>

          {/* Peso Total */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
              <Weight className="h-3 w-3" />
              Peso Total
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {loteAtivoCaixa01.peso_atual.toFixed(2)} kg
            </div>
          </div>

          {/* Voluntários */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" />
              Voluntários
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {voluntariosCount}
            </div>
          </div>

          {loteAtivoCaixa01.data_encerramento && (
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Finalizado em
              </div>
              <div className="text-sm text-green-900 dark:text-green-100">
                {format(new Date(loteAtivoCaixa01.data_encerramento), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
              </div>
            </div>
          )}

          {/* Localização */}
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Localização
            </div>
            <div className="text-xs font-mono text-green-700 dark:text-green-300 bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-green-300/50 dark:border-green-600/50">
              {formatLocation(loteAtivoCaixa01.latitude, loteAtivoCaixa01.longitude)}
            </div>
          </div>

          {/* Criador */}
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <div className="text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado por
            </div>
            <div className="text-sm text-green-900 dark:text-green-100">
              {loteAtivoCaixa01.criado_por_nome}
            </div>
          </div>
        </div>

        {/* Botão Encerrar */}
        {loteAtivoCaixa01.status === 'ativo' && (
          <div className="pt-4 border-t border-green-300/30 dark:border-green-600/30">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isClosing}
                  className="w-full sm:w-auto"
                >
                  {isClosing ? 'Encerrando...' : 'Encerrar Lote'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
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
        )}
      </CardContent>
    </Card>
  );
};