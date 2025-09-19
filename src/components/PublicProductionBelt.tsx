import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, User, Thermometer, Droplets, Camera } from 'lucide-react';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import type { LoteExtended } from '@/hooks/usePublicProductionBelt';

// Interface já importada do hook

interface PublicProductionBeltProps {
  lotesAtivos: LoteExtended[];
}

export const PublicProductionBelt = ({ lotesAtivos }: PublicProductionBeltProps) => {
  // Organiza lotes por caixa (1-7) - exatamente igual ao ProductionBelt
  const caixasPorLote = Array.from({ length: 7 }, (_, index) => {
    const numeroBox = index + 1;
    const loteNaBox = lotesAtivos.find(lote => lote.caixa_atual === numeroBox);
    return { numeroBox, lote: loteNaBox };
  });

  const getBoxColor = (numeroBox: number, lote?: LoteExtended) => {
    if (!lote) return 'bg-muted/30 border-dashed border-muted';
    
    if (numeroBox === 1) return 'bg-primary/10 border-primary/30';
    if (numeroBox === 7) return 'bg-success/10 border-success/30';
    return 'bg-secondary/10 border-secondary/30';
  };

  const getPhaseBadge = (numeroBox: number) => {
    switch (numeroBox) {
      case 1:
        return (
          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-xs px-2 py-0.5">
            Mesofílica
          </Badge>
        );
      case 2:
      case 3:
      case 4:
      case 5:
        return (
          <Badge className="bg-red-500 text-white hover:bg-red-600 text-xs px-2 py-0.5">
            Termofílico
          </Badge>
        );
      case 6:
        return (
          <Badge className="bg-blue-500 text-white hover:bg-blue-600 text-xs px-2 py-0.5">
            Resfriamento
          </Badge>
        );
      case 7:
        return (
          <Badge className="bg-green-500 text-white hover:bg-green-600 text-xs px-2 py-0.5">
            Maturação
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Esteira Visual - Idêntica ao ProductionBelt */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: 'max-content' }}>
          {caixasPorLote.map(({ numeroBox, lote }, index) => (
            <div key={numeroBox} className="flex items-center">
              {/* Caixa de Compostagem - Idêntica ao ProductionBelt */}
              <Card className={`
                relative w-64 sm:w-72 h-auto min-h-[280px] sm:min-h-[300px] transition-all duration-300
                ${getBoxColor(numeroBox, lote)}
                ${lote ? 'hover:shadow-lg' : ''}
              `}>
                <CardContent className="p-3 h-full flex flex-col">
                  {/* Header da Caixa */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-semibold text-sm">Caixa {numeroBox}</span>
                    </div>
                    {lote ? getPhaseBadge(numeroBox) : getPhaseBadge(numeroBox)}
                  </div>

                  {/* Conteúdo da Caixa */}
                  {lote ? (
                    <div className="flex-1 space-y-3">
                      {/* Código do Lote - Destaque Principal */}
                      <div className="text-center bg-primary/5 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground mb-1">Lote</p>
                        <p className="text-sm font-bold text-primary">
                          {lote.codigo}
                        </p>
                      </div>

                      {/* Peso Atual - Destaque Secundário */}
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Peso Atual</p>
                        <p className="text-xl font-bold text-foreground">
                          {lote.peso_atual?.toFixed(1) || '0.0'}kg
                        </p>
                      </div>

                       {/* Data de Entrada e Final */}
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Entrada</p>
                        <p className="text-xs font-medium">
                          {formatarData(lote.data_inicio)} às {formatarHora(lote.data_inicio)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Final: {formatarData(new Date(new Date(lote.data_inicio).getTime() + 7 * 7 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      </div>

                      {/* Validador e Voluntários */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Validador
                          </p>
                          <p className="font-medium truncate">
                            {lote.validadorNome}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Voluntários</p>
                          <p className="font-medium">
                            {lote.voluntariosUnicos || 0} pessoas
                          </p>
                        </div>
                      </div>

                      {/* Dados IoT Simplificados */}
                      <div className="bg-muted/30 rounded-lg p-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-orange-500" />
                            <span>{lote.temperatura}°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-500" />
                            <span>{lote.umidade}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Ver Fotos Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-2"
                        onClick={() => window.open(`/fotos/${lote.id}`, '_blank')}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Ver Fotos
                      </Button>

                      {/* Progresso */}
                      <div className="mt-auto pt-2">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">
                            Semana {numeroBox} de 7
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Caixa vazia
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Aguardando lote
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Semana {numeroBox} de 7
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

              {/* Seta de Fluxo - Responsiva */}
              {index < caixasPorLote.length - 1 && (
                <div className="mx-1 sm:mx-2 flex items-center">
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};