import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, User, Weight, Users, Play, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLotes } from '@/hooks/useLotes';

export const LoteCard = () => {
  const { loteAtivoCaixa01, voluntariosCount, loading, criarNovoLote, encerrarLote, cancelarLote } = useLotes();
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');

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

  const handleCancelarLote = async () => {
    if (!loteAtivoCaixa01) return;
    
    setIsCanceling(true);
    const success = await cancelarLote(loteAtivoCaixa01.id);
    if (success) {
      setConfirmCode('');
    }
    setIsCanceling(false);
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
      <Card className="mb-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/40 border-amber-200/50 dark:border-amber-800/30 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-lg">
            <Play className="h-4 w-4" />
            Iniciar Novo Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <p className="text-amber-700 dark:text-amber-300 mb-4 text-sm">
            Começe um novo lote na Caixa 01 antes de receber resíduos.
          </p>
          <Button 
            onClick={handleCriarLote}
            disabled={isCreating}
            size="sm"
            className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
          >
            {isCreating ? 'Criando...' : 'Começar'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado: Com lote ativo na Caixa 01
  return (
    <Card className="mb-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40 border-emerald-200/50 dark:border-emerald-800/30 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-lg">
            <Weight className="h-4 w-4" />
            Lote Ativo - Caixa 01
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600 w-fit text-xs">
            Semana {loteAtivoCaixa01.semana_atual}/7
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Código do Lote */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Código
            </div>
            <div className="text-xs font-mono bg-white/70 dark:bg-black/30 px-2 py-1 rounded border border-emerald-300/50 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-200">
              {loteAtivoCaixa01.codigo}
            </div>
          </div>

          {/* Peso Total */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
              <Weight className="h-3 w-3" />
              Peso
            </div>
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              {loteAtivoCaixa01.peso_atual.toFixed(2)} kg
            </div>
          </div>

          {/* Voluntários */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" />
              Voluntários
            </div>
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              {voluntariosCount}
            </div>
          </div>

          {/* Data/Hora de Início */}
          <div className="space-y-1 col-span-1 sm:col-span-3">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Iniciado em
            </div>
            <div className="text-xs text-emerald-800 dark:text-emerald-200">
              {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
            </div>
          </div>

          {loteAtivoCaixa01.data_encerramento && (
            <div className="space-y-1 col-span-1 sm:col-span-3">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Finalizado em
              </div>
              <div className="text-xs text-emerald-800 dark:text-emerald-200">
                {format(new Date(loteAtivoCaixa01.data_encerramento), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
              </div>
            </div>
          )}

          {/* Localização */}
          <div className="space-y-1 col-span-1 sm:col-span-3">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Localização
            </div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-emerald-300/50 dark:border-emerald-600/50">
              {formatLocation(loteAtivoCaixa01.latitude, loteAtivoCaixa01.longitude)}
            </div>
          </div>

          {/* Criador */}
          <div className="space-y-1 col-span-1 sm:col-span-3">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado por
            </div>
            <div className="text-xs text-emerald-800 dark:text-emerald-200">
              {loteAtivoCaixa01.criado_por_nome}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        {loteAtivoCaixa01.status === 'ativo' && (
          <div className="pt-3 border-t border-emerald-300/30 dark:border-emerald-600/30 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Botão Encerrar */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={isClosing || isCanceling}
                    className="flex-1 sm:flex-none"
                  >
                    {isClosing ? 'Encerrando...' : 'Encerrar Entregas'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar Entregas</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja finalizar a fase de entregas do lote <strong>{loteAtivoCaixa01.codigo}</strong>?
                      <br /><br />
                      O lote será transferido para a esteira de produção e não poderá mais receber novos resíduos.
                      O peso total atual é de <strong>{loteAtivoCaixa01.peso_atual.toFixed(2)} kg</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleEncerrarLote}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Finalizar Entregas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Botão Cancelar Lote */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isClosing || isCanceling}
                    className="flex-1 sm:flex-none border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {isCanceling ? 'Cancelando...' : 'Cancelar Lote'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      Cancelar Lote - AÇÃO IRREVERSÍVEL
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        <strong>ATENÇÃO:</strong> Esta ação irá cancelar completamente o lote <strong>{loteAtivoCaixa01.codigo}</strong> e:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-200 dark:border-red-800">
                        <li><strong>{voluntariosCount}</strong> registros de voluntários serão perdidos</li>
                        <li>Todas as entregas e fotos do lote serão <strong>deletadas permanentemente</strong></li>
                        <li>O lote voltará ao estado inicial (sem lote ativo)</li>
                        <li><strong>Esta ação NÃO PODE ser desfeita</strong></li>
                      </ul>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Para confirmar, digite o código do lote:</p>
                        <Input
                          value={confirmCode}
                          onChange={(e) => setConfirmCode(e.target.value)}
                          placeholder={loteAtivoCaixa01.codigo}
                          className="font-mono"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmCode('')}>
                      Manter Lote
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelarLote}
                      disabled={confirmCode !== loteAtivoCaixa01.codigo}
                      className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    >
                      Cancelar Definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};