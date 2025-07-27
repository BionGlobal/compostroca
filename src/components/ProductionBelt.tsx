import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, Package, ArrowRight, Settings } from 'lucide-react';
import { LoteExtended } from '@/hooks/useLotesManager';

interface ProductionBeltProps {
  lotesAtivos: LoteExtended[];
  onManejoClick: (lote: LoteExtended) => void;
  onFinalizarClick: (lote: LoteExtended) => void;
}

export const ProductionBelt = ({ lotesAtivos, onManejoClick, onFinalizarClick }: ProductionBeltProps) => {
  // Organiza lotes por caixa (1-7)
  const caixasPorLote = Array.from({ length: 7 }, (_, index) => {
    const numeroBox = index + 1;
    const loteNaBox = lotesAtivos.find(lote => lote.caixa_atual === numeroBox);
    return { numeroBox, lote: loteNaBox };
  });

  const getStatusIcon = (statusManejo: string) => {
    switch (statusManejo) {
      case 'atrasado':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'realizado':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (statusManejo: string) => {
    switch (statusManejo) {
      case 'atrasado':
        return 'destructive';
      case 'pendente':
        return 'secondary';
      case 'realizado':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getBoxColor = (numeroBox: number, lote?: LoteExtended) => {
    if (!lote) return 'bg-muted/30 border-dashed border-muted';
    
    if (numeroBox === 1) return 'bg-primary/10 border-primary/30';
    if (numeroBox === 7) return 'bg-success/10 border-success/30';
    return 'bg-secondary/10 border-secondary/30';
  };

  const getReducaoPercentual = (lote: LoteExtended): number => {
    return ((lote.peso_inicial - lote.peso_atual) / lote.peso_inicial) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Header da Esteira */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Esteira de Produção</h3>
          <p className="text-sm text-muted-foreground">
            Processo de compostagem em 7 semanas
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {lotesAtivos.length}/7 caixas ocupadas
        </Badge>
      </div>

      {/* Esteira Visual - Scroll Horizontal */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px] w-full">
          {caixasPorLote.map(({ numeroBox, lote }, index) => (
            <div key={numeroBox} className="flex items-center">
              {/* Caixa de Compostagem */}
              <Card className={`
                relative min-w-[160px] h-[200px] transition-all duration-300
                ${getBoxColor(numeroBox, lote)}
                ${lote ? 'organic-hover cursor-pointer' : ''}
              `}>
                <CardContent className="p-4 h-full flex flex-col">
                  {/* Header da Caixa */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <span className="font-semibold">Box {numeroBox}</span>
                    </div>
                    {lote && getStatusIcon(lote.statusManejo)}
                  </div>

                  {/* Conteúdo da Caixa */}
                  {lote ? (
                    <div className="flex-1 space-y-3">
                      {/* Código do Lote */}
                      <div>
                        <p className="text-xs text-muted-foreground">Lote</p>
                        <p className="text-sm font-medium truncate">
                          {lote.codigo.split('-').pop()}
                        </p>
                      </div>

                      {/* Peso Atual */}
                      <div>
                        <p className="text-xs text-muted-foreground">Peso</p>
                        <p className="text-lg font-bold">
                          {lote.peso_atual.toFixed(1)}kg
                        </p>
                      </div>

                      {/* Redução */}
                      <div>
                        <p className="text-xs text-muted-foreground">Redução</p>
                        <p className="text-sm font-medium text-success">
                          -{getReducaoPercentual(lote).toFixed(1)}%
                        </p>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={getStatusBadgeVariant(lote.statusManejo)}
                        className="text-xs w-full justify-center"
                      >
                        {lote.statusManejo === 'atrasado' && 'Atrasado'}
                        {lote.statusManejo === 'pendente' && 'Pendente'}
                        {lote.statusManejo === 'realizado' && 'Em dia'}
                      </Badge>

                      {/* Ações */}
                      <div className="mt-auto">
                        {numeroBox === 7 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onFinalizarClick(lote)}
                          >
                            Finalizar
                          </Button>
                        ) : lote.statusManejo !== 'realizado' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onManejoClick(lote)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manejo
                          </Button>
                        ) : (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              Semana {lote.semana_atual}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Caixa vazia
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Indicador de Progresso */}
                {lote && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${lote.progressoPercentual}%` }}
                    />
                  </div>
                )}
              </Card>

              {/* Seta de Fluxo */}
              {index < caixasPorLote.length - 1 && (
                <div className="mx-2 flex items-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
          <span>Entrada (Box 1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-secondary/20 border border-secondary/30" />
          <span>Processamento (Box 2-6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
          <span>Finalização (Box 7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted/30 border border-muted border-dashed" />
          <span>Vazia</span>
        </div>
      </div>
    </div>
  );
};