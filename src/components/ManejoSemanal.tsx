import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ManejoStep } from './ManejoStep';
import { useManejoSemanal } from '@/hooks/useManejoSemanal';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X,
  AlertTriangle,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';

interface ManejoSemanalProps {
  open: boolean;
  onClose: () => void;
  lotes: any[];
  organizacao: string;
  onManejoCompleto: () => void;
}

export const ManejoSemanal: React.FC<ManejoSemanalProps> = ({
  open,
  onClose,
  lotes,
  organizacao,
  onManejoCompleto
}) => {
  const {
    estadoManejo,
    loading,
    uploading,
    iniciarManejo,
    uploadFoto,
    atualizarEtapa,
    proximaEtapa,
    etapaAnterior,
    finalizarManejo,
    cancelarManejo,
    recuperarManejo
  } = useManejoSemanal();

  useEffect(() => {
    if (open) {
      recuperarManejo();
    }
  }, [open, recuperarManejo]);

  const handleIniciarManejo = async () => {
    await iniciarManejo(lotes, organizacao);
  };

  const handleFinalizarManejo = async () => {
    try {
      await finalizarManejo();
      
      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Chamar callback de sucesso
      onManejoCompleto();
      
      // Fechar modal com delay para evitar conflitos
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro no handler de finalização:', error);
      // Modal permanece aberto para o usuário tentar novamente
    }
  };

  const handleCancelarManejo = () => {
    cancelarManejo();
    onClose();
  };

  const etapaAtual = estadoManejo?.etapas[estadoManejo.etapaAtual];
  const progresso = estadoManejo ? ((estadoManejo.etapaAtual + 1) / estadoManejo.etapas.length) * 100 : 0;
  const todasEtapasConcluidas = estadoManejo?.etapas.every(e => 
    e.foto && e.pesoNovo !== undefined
  ) || false;

  // Verificar se há lotes suficientes
  const lotesAtivos = lotes.filter(l => l.status === 'ativo');
  const temLotesSuficientes = lotesAtivos.length >= 7;

  if (!open) return null;

  // Tela de verificação inicial
  if (!estadoManejo) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Manejo Semanal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status do sistema */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lotes ativos:</span>
                  <Badge variant={temLotesSuficientes ? "default" : "destructive"}>
                    {lotesAtivos.length}/7
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Caixas ocupadas:</span>
                  <span className="text-sm font-medium">
                    {Array.from(new Set(lotesAtivos.map(l => l.caixa_atual))).sort().join(', ')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Verificações */}
            {!temLotesSuficientes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Não é possível iniciar o manejo
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      É necessário ter lotes ativos em todas as 7 caixas para realizar o manejo semanal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo do processo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Processo de Manejo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <p>• Finalizar e distribuir composto da caixa 7</p>
                  <p>• Transferir conteúdo entre caixas (6→7, 5→6, etc.)</p>
                  <p>• Liberar caixa 1 para novos lotes</p>
                  <p>• Documentar com fotos e pesos</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={handleIniciarManejo}
                disabled={!temLotesSuficientes || loading}
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                {loading ? 'Iniciando...' : 'Iniciar Manejo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Tela de resumo final
  if (todasEtapasConcluidas) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Finalizar Manejo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Todas as etapas concluídas!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Você completou todas as {estadoManejo.etapas.length} etapas do manejo semanal.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo das operações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo das Operações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {estadoManejo.etapas.map((etapa, index) => (
                  <div key={etapa.id} className="flex items-center justify-between text-sm">
                    <span>
                      {etapa.tipo === 'finalizacao' 
                        ? `Finalizar Caixa ${etapa.caixaOrigem}`
                        : `Caixa ${etapa.caixaOrigem} → ${etapa.caixaDestino}`
                      }
                    </span>
                    <Badge variant="default">
                      {etapa.pesoNovo?.toFixed(1)} kg
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={handleCancelarManejo}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={handleFinalizarManejo}
                disabled={loading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                {loading ? 'Finalizando...' : 'Confirmar Manejo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Wizard principal
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Manejo Semanal
          </DialogTitle>
          
          <div className="space-y-2">
            <Progress value={progresso} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Etapa {estadoManejo.etapaAtual + 1} de {estadoManejo.etapas.length}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {etapaAtual && (
            <ManejoStep
              etapa={etapaAtual}
              etapaIndex={estadoManejo.etapaAtual}
              totalEtapas={estadoManejo.etapas.length}
              onUpdateEtapa={(dados) => atualizarEtapa(estadoManejo.etapaAtual, dados)}
              onUploadFoto={uploadFoto}
              uploading={uploading}
            />
          )}

          {/* Navegação */}
          <div className="flex gap-2">
            <Button
              onClick={handleCancelarManejo}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <div className="flex-1" />

            {estadoManejo.etapaAtual > 0 && (
              <Button
                onClick={etapaAnterior}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {estadoManejo.etapaAtual < estadoManejo.etapas.length - 1 && (
              <Button
                onClick={proximaEtapa}
                disabled={!etapaAtual?.foto || etapaAtual?.pesoNovo === undefined}
                size="sm"
              >
                Próxima
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};