import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, Package, ArrowRight, Settings, MapPin, User, Thermometer, Droplets } from 'lucide-react';
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

      {/* Esteira Visual - Mobile-First Design */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: 'max-content' }}>
          {caixasPorLote.map(({ numeroBox, lote }, index) => (
            <div key={numeroBox} className="flex items-center">
              {/* Caixa de Compostagem - Responsiva */}
              <Card className={`
                relative w-72 sm:w-80 h-auto min-h-[320px] sm:min-h-[350px] transition-all duration-300
                ${getBoxColor(numeroBox, lote)}
                ${lote ? 'organic-hover cursor-pointer' : ''}
              `}>
                <CardContent className="p-3 sm:p-4 h-full flex flex-col">
                  {/* Header da Caixa */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-semibold text-sm sm:text-base">Caixa {numeroBox}</span>
                    </div>
                    {lote && getStatusIcon(lote.statusManejo)}
                  </div>

                  {/* Conteúdo da Caixa */}
                  {lote ? (
                    <div className="flex-1 space-y-3">
                      {/* Linha 1: Código e Data/Hora */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Lote</p>
                          <p className="text-sm font-medium truncate">
                            {lote.codigo}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Entrada</p>
                          <p className="text-xs font-medium">
                            {formatarData(lote.dataEntradaCaixa)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatarHora(lote.dataEntradaCaixa)}
                          </p>
                        </div>
                      </div>

                      {/* Linha 2: Peso Atual */}
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Peso Atual</p>
                        <p className="text-2xl font-bold text-primary">
                          {lote.peso_atual.toFixed(1)}kg
                        </p>
                      </div>

                      {/* Linha 3: Geolocalização */}
                      {lote.latitude && lote.longitude && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Localização
                          </p>
                          <p className="text-xs font-mono">
                            {lote.latitude.toFixed(6)}, {lote.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}

                      {/* Linha 4: Validador e Voluntários */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Validador
                          </p>
                          <p className="text-xs font-medium truncate">
                            {lote.validadorNome}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Voluntários</p>
                          <p className="text-sm font-medium">
                            {lote.voluntariosUnicos} pessoas
                          </p>
                        </div>
                      </div>

                      {/* Linha 5: Dados IoT */}
                      <div className="bg-muted/30 rounded-lg p-2 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Monitoramento IoT</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-orange-500" />
                            <span>{lote.temperatura}°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-500" />
                            <span>{lote.umidade}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">pH:</span> {lote.ph}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cond:</span> {lote.condutividade}
                          </div>
                          <div>
                            <span className="text-muted-foreground">N:</span> {lote.nitrogenio}ppm
                          </div>
                          <div>
                            <span className="text-muted-foreground">P:</span> {lote.fosforo}ppm
                          </div>
                          <div>
                            <span className="text-muted-foreground">K:</span> {lote.potassio}ppm
                          </div>
                        </div>
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
                      <div className="mt-auto pt-2">
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
                              Semana {lote.semana_atual} de 7
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
                        <p className="text-xs text-muted-foreground mt-1">
                          Aguardando lote
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

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
          <span>Entrada (Caixa 1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-secondary/20 border border-secondary/30" />
          <span>Processamento (Caixa 2-6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
          <span>Finalização (Caixa 7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted/30 border border-muted border-dashed" />
          <span>Vazia</span>
        </div>
      </div>
    </div>
  );
};