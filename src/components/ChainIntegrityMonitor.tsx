import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, RefreshCw, Wrench, Info } from 'lucide-react';
import { useChainValidation } from '@/hooks/useChainValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from '@/components/ui/dialog';
import { formatHashDisplay } from '@/lib/hashUtils';

interface ChainIntegrityMonitorProps {
  unidade?: string;
  autoValidate?: boolean;
}

export const ChainIntegrityMonitor: React.FC<ChainIntegrityMonitorProps> = ({ 
  unidade, 
  autoValidate = true 
}) => {
  const { validateChainIntegrity, repairChainFromIndex, validationResult, loading } = useChainValidation();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (autoValidate) {
      validateChainIntegrity(unidade);
    }
  }, [unidade, autoValidate]);

  const handleValidate = () => {
    validateChainIntegrity(unidade);
  };

  const handleRepair = () => {
    if (validationResult?.brokenAtIndex !== undefined) {
      repairChainFromIndex(validationResult.brokenAtIndex, unidade || 'CWB001');
    }
  };

  const getStatusColor = () => {
    if (!validationResult) return 'secondary';
    return validationResult.isValid ? 'success' : 'destructive';
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!validationResult) return <Info className="h-4 w-4" />;
    return validationResult.isValid ? 
      <Shield className="h-4 w-4" /> : 
      <AlertTriangle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (loading) return 'Validando...';
    if (!validationResult) return 'Não validado';
    return validationResult.isValid ? 'Cadeia Íntegra' : 'Quebra Detectada';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Integridade da Cadeia Blockchain
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Validar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {validationResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total de Lotes:</span>
                <p className="font-medium">{validationResult.totalLotes}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lotes Validados:</span>
                <p className="font-medium">{validationResult.validatedChainLength}</p>
              </div>
            </div>

            {!validationResult.isValid && validationResult.brokenAtIndex !== undefined && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    Quebra detectada no índice {validationResult.brokenAtIndex}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRepair}
                    disabled={loading}
                    className="ml-2"
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Reparar
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Info className="h-4 w-4 mr-1" />
                  Ver Detalhes da Cadeia
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detalhes da Cadeia de Integridade</DialogTitle>
                  <DialogDescription>
                    Informações detalhadas sobre a validação da cadeia blockchain
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Status da Cadeia</h4>
                      <Badge variant={getStatusColor()} className="flex items-center gap-1 w-fit">
                        {getStatusIcon()}
                        {getStatusText()}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Unidade</h4>
                      <p className="text-sm">{unidade || 'Todas as unidades'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Total de Lotes</h4>
                      <p className="text-2xl font-bold">{validationResult.totalLotes}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Lotes Validados</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {validationResult.validatedChainLength}
                      </p>
                    </div>
                  </div>

                  {!validationResult.isValid && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Detalhes da Quebra</h4>
                      <div className="bg-red-50 p-3 rounded-lg space-y-1">
                        <p className="text-sm">
                          <strong>Índice da Quebra:</strong> {validationResult.brokenAtIndex}
                        </p>
                        {validationResult.brokenLoteId && (
                          <p className="text-sm">
                            <strong>ID do Lote:</strong> {formatHashDisplay(validationResult.brokenLoteId)}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          A cadeia foi validada até o índice {validationResult.validatedChainLength - 1}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium">Como Funciona</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Cada lote possui um hash único baseado em seus dados</p>
                      <p>• O hash de cada lote inclui o hash do lote anterior</p>
                      <p>• Isso cria uma cadeia blockchain-like imutável</p>
                      <p>• Qualquer alteração quebra a cadeia e é detectada</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};