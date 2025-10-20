import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, Package, ArrowRight, Settings, MapPin, User, Thermometer, Droplets, Camera, FileText, Leaf, FlaskConical, Zap } from 'lucide-react';
import { LoteExtended } from '@/hooks/useLotesManager';
import { useNavigate } from 'react-router-dom';

interface ProductionBeltProps {
  lotesAtivos: LoteExtended[];
  onManejoClick: (lote: LoteExtended) => void;
  onFinalizarClick: (lote: LoteExtended) => void;
  onViewPhotos?: (loteId: string, title: string, isLoteProng?: boolean) => void;
}

export const ProductionBelt = ({ lotesAtivos, onManejoClick, onFinalizarClick, onViewPhotos }: ProductionBeltProps) => {
  const navigate = useNavigate();
  
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
      {/* Esteira Visual - Mobile-First Design */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: 'max-content' }}>
          {caixasPorLote.map(({ numeroBox, lote }, index) => (
            <div key={numeroBox} className="flex items-center">
              {/* Caixa de Compostagem - Responsiva e Otimizada */}
              <Card className={`
                relative w-64 sm:w-72 h-[420px] sm:h-[440px] transition-all duration-300
                ${getBoxColor(numeroBox, lote)}
                ${lote ? 'hover:shadow-lg cursor-pointer' : ''}
              `}>
                <CardContent className="p-3 h-full flex flex-col">
                  {/* Header da Caixa */}
                  <div className="flex items-center justify-between mb-2.5">
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
                      <div className="text-center bg-primary/5 rounded-lg p-1.5 mb-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Lote</p>
                        <p className="text-xs font-bold text-primary">
                          {lote.codigo}
                        </p>
                      </div>

                      {/* Peso Atual - Destaque Secundário */}
                      <div className="text-center mb-1">
                        <p className="text-[10px] text-muted-foreground">Peso Atual</p>
                        <p className="text-lg font-bold text-foreground">
                          {lote.peso_atual?.toFixed(1) || '0.0'}kg
                        </p>
                      </div>

                       {/* Data de Entrada e Final */}
                      <div className="text-center mb-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          Entrada: {formatarData(lote.data_inicio)} {formatarHora(lote.data_inicio)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Final: {formatarData(new Date(new Date(lote.data_inicio).getTime() + 7 * 7 * 24 * 60 * 60 * 1000).toISOString())}
                        </p>
                      </div>

                      {/* Validador e Voluntários */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
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

                      {/* Monitoramento Live de Sensores IoT */}
                      {lote.ultima_leitura_sensores && (numeroBox === 2 || numeroBox === 6) && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg p-1.5 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                              Live
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            {numeroBox === 2 && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Thermometer className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                  <span className="font-medium text-foreground">
                                    {lote.ultima_leitura_sensores.temperatura_solo?.toFixed(1) || '-'}°C
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Droplets className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                  <span className="font-medium text-foreground">
                                    {lote.ultima_leitura_sensores.umidade_solo?.toFixed(1) || '-'}%
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">Cond:</span>
                                  <span className="font-medium text-foreground">
                                    {lote.ultima_leitura_sensores.condutividade_agua_poros?.toFixed(2) || '-'} mS/cm
                                  </span>
                                </div>
                              </>
                            )}
                            
                            {numeroBox === 6 && (
                              <>
                                <div className="col-span-2 flex items-center gap-1">
                                  <Leaf className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">NPK:</span>
                                  <span className="font-medium text-foreground font-mono">
                                    {lote.ultima_leitura_sensores.nitrogenio?.toFixed(0) || '-'}/
                                    {lote.ultima_leitura_sensores.fosforo?.toFixed(0) || '-'}/
                                    {lote.ultima_leitura_sensores.potassio?.toFixed(0) || '-'}
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <FlaskConical className="h-3 w-3 text-purple-500 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">pH:</span>
                                  <span className="font-medium text-foreground">
                                    {lote.ultima_leitura_sensores.ph?.toFixed(1) || '-'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <p className="text-[8px] text-muted-foreground mt-1 italic text-center">
                            {new Date(lote.ultima_leitura_sensores.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {/* Fallback: Placeholder de Sensores (quando não há dados live) */}
                      {!lote.ultima_leitura_sensores && (numeroBox === 2 || numeroBox === 6) && (
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Aguardando
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            {numeroBox === 2 && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Thermometer className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="font-medium text-muted-foreground">-°C</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Droplets className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="font-medium text-muted-foreground">-%</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">Cond:</span>
                                  <span className="font-medium text-muted-foreground">- mS/cm</span>
                                </div>
                              </>
                            )}
                            
                            {numeroBox === 6 && (
                              <>
                                <div className="col-span-2 flex items-center gap-1">
                                  <Leaf className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">NPK:</span>
                                  <span className="font-medium text-muted-foreground font-mono">-/-/-</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <FlaskConical className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-[9px] text-muted-foreground">pH:</span>
                                  <span className="font-medium text-muted-foreground">-</span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <p className="text-[8px] text-muted-foreground mt-1 italic text-center">
                            Coleta: 23:00 UTC
                          </p>
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div className="grid grid-cols-2 gap-1 mb-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] py-1"
                          onClick={() => navigate(`/lote/auditoria/${lote.codigo_unico}`)}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        {onViewPhotos && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] py-1"
                            onClick={() => onViewPhotos(lote.id, `Fotos das Entregas - ${lote.codigo}`, false)}
                          >
                            <Camera className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Ações e Semana */}
                      <div>
                        {numeroBox !== 7 && lote.statusManejo !== 'realizado' ? (
                          <div className="space-y-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-[10px]"
                              onClick={() => onManejoClick(lote)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Manejo
                            </Button>
                            <p className="text-[9px] text-center text-muted-foreground">
                              Semana {numeroBox} de 7
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-center text-muted-foreground">
                            Semana {numeroBox} de 7
                          </p>
                        )}
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