import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Thermometer, Droplets, Calendar, Timer, User, Leaf } from 'lucide-react';
import { formatPesoDisplay } from '@/lib/organizationUtils';

interface LoteExtended {
  id: string;
  codigo: string;
  peso_inicial: number;
  peso_atual: number;
  data_inicio: string;
  data_proxima_transferencia: string | null;
  status: string;
  caixa_atual: number;
  semana_atual: number;
  criado_por_nome: string;
  unidade: string;
  iot_data: any;
  linha_producao: string;
}

interface PublicProductionBeltProps {
  lotesAtivos: LoteExtended[];
}

export const PublicProductionBelt = ({ lotesAtivos }: PublicProductionBeltProps) => {
  // Organizar lotes nas 7 caixas
  const boxes = Array.from({ length: 7 }, (_, index) => {
    const boxNumber = index + 1;
    const lote = lotesAtivos.find(l => l.caixa_atual === boxNumber);
    return { boxNumber, lote };
  });

  const getBoxColor = (boxNumber: number, hasLote: boolean) => {
    if (!hasLote) return 'border-muted bg-muted/20';
    
    const colors = [
      'border-success bg-success/10',      // Caixa 1
      'border-primary bg-primary/10',      // Caixa 2  
      'border-secondary bg-secondary/10',  // Caixa 3
      'border-earth bg-earth/10',          // Caixa 4
      'border-warning bg-warning/10',      // Caixa 5
      'border-primary bg-primary/15',      // Caixa 6
      'border-success bg-success/15',      // Caixa 7
    ];
    
    return colors[boxNumber - 1] || 'border-muted bg-muted/20';
  };

  const getBadgeVariant = (boxNumber: number) => {
    const variants = [
      'default',      // Caixa 1
      'secondary',    // Caixa 2
      'outline',      // Caixa 3
      'default',      // Caixa 4
      'secondary',    // Caixa 5
      'outline',      // Caixa 6
      'default',      // Caixa 7
    ];
    
    return variants[boxNumber - 1] || 'outline';
  };

  const getPhaseLabel = (boxNumber: number) => {
    const phases = [
      'Início',
      'Aquecimento',
      'Ativo',
      'Maturação',
      'Estabilização',
      'Cura',
      'Pronto'
    ];
    
    return phases[boxNumber - 1] || `Fase ${boxNumber}`;
  };

  const calculateProgress = (semanaAtual: number) => {
    return Math.min((semanaAtual / 7) * 100, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
        {boxes.map(({ boxNumber, lote }) => (
          <Card 
            key={boxNumber}
            className={`
              min-w-[280px] flex-shrink-0 glass-light organic-hover snap-center
              ${getBoxColor(boxNumber, !!lote)}
            `}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header da Caixa */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <span className="font-semibold text-foreground">
                    Caixa {boxNumber}
                  </span>
                </div>
                <Badge 
                  variant={getBadgeVariant(boxNumber) as any}
                  className="text-xs"
                >
                  {getPhaseLabel(boxNumber)}
                </Badge>
              </div>

              {lote ? (
                <>
                  {/* Código do Lote */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-primary">
                      {lote.codigo}
                    </h3>
                  </div>

                  {/* Peso Atual */}
                  <div className="text-center py-2">
                    <div className="text-2xl font-bold text-success">
                      {formatPesoDisplay(lote.peso_atual)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Peso atual
                    </div>
                  </div>

                  {/* Informações do Lote */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Início: {formatDate(lote.data_inicio)}</span>
                    </div>
                    
                    {lote.data_proxima_transferencia && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Timer className="w-4 h-4" />
                        <span>Próxima: {formatDate(lote.data_proxima_transferencia)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="truncate">{lote.criado_por_nome}</span>
                    </div>
                  </div>

                  {/* Dados IoT */}
                  {lote.iot_data && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {lote.iot_data.temperatura && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Thermometer className="w-3 h-3" />
                          <span>{lote.iot_data.temperatura}°C</span>
                        </div>
                      )}
                      {lote.iot_data.umidade && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Droplets className="w-3 h-3" />
                          <span>{lote.iot_data.umidade}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Barra de Progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Semana {lote.semana_atual}/7</span>
                      <span>{Math.round(calculateProgress(lote.semana_atual))}%</span>
                    </div>
                    <Progress value={calculateProgress(lote.semana_atual)} className="h-2" />
                  </div>
                </>
              ) : (
                /* Caixa Vazia */
                <div className="text-center py-8 text-muted-foreground">
                  <Leaf className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aguardando próximo lote</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};