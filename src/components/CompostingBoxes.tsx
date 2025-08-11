import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, 
  Droplets, 
  Zap, 
  Leaf, 
  Scale,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useLotesManager } from '@/hooks/useLotesManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompostingBox {
  number: number;
  weight: number; // kg
  status: 'mesofilica' | 'termofilico' | 'resfriamento' | 'maturacao' | 'vazia';
  week: number;
  loteCode?: string;
  loteData?: string;
  temperature?: number; // Apenas na caixa 1
  chemistry?: {
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  }; // Apenas na caixa 6
}

export const CompostingBoxes = () => {
  const { lotesAtivos, loading } = useLotesManager();

  const getPhaseStatus = (caixa: number, semana: number): 'mesofilica' | 'termofilico' | 'resfriamento' | 'maturacao' | 'vazia' => {
    if (caixa === 1) return 'mesofilica';
    if (caixa >= 2 && caixa <= 5) return 'termofilico';
    if (caixa === 6) return 'resfriamento';
    if (caixa === 7) {
      // Primeiros 3 dias da semana 7 = resfriamento, depois maturação
      return semana === 7 ? 'resfriamento' : 'maturacao';
    }
    return 'vazia';
  };

  const createBox = (boxNumber: number): CompostingBox => {
    const loteNaCaixa = lotesAtivos.find(lote => lote.caixa_atual === boxNumber);
    
    if (!loteNaCaixa) {
      return {
        number: boxNumber,
        weight: 0,
        status: 'vazia',
        week: 0,
      };
    }

    const status = getPhaseStatus(loteNaCaixa.caixa_atual, loteNaCaixa.semana_atual);
    
    return {
      number: boxNumber,
      weight: loteNaCaixa.peso_atual,
      status,
      week: loteNaCaixa.semana_atual,
      loteCode: loteNaCaixa.codigo,
      loteData: loteNaCaixa.data_inicio,
      temperature: boxNumber === 1 ? loteNaCaixa.temperatura : undefined,
      chemistry: boxNumber === 6 ? {
        ph: loteNaCaixa.ph || 7.2,
        nitrogen: (loteNaCaixa.nitrogenio || 21) / 10, // Converte de mg/kg para %
        phosphorus: (loteNaCaixa.fosforo || 8) / 10,
        potassium: (loteNaCaixa.potassio || 15) / 10,
      } : undefined,
    };
  };

  const boxes: CompostingBox[] = Array.from({ length: 7 }, (_, i) => createBox(i + 1));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mesofilica':
        return 'bg-warning text-warning-foreground';
      case 'termofilico':
        return 'bg-destructive text-destructive-foreground';
      case 'resfriamento':
        return 'bg-primary text-primary-foreground';
      case 'maturacao':
        return 'bg-success text-success-foreground';
      case 'vazia':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'mesofilica': return 'Mesofílica';
      case 'termofilico': return 'Termofílico';
      case 'resfriamento': return 'Resfriamento';
      case 'maturacao': return 'Maturação';
      case 'vazia': return 'Vazia';
      default: return status;
    }
  };

  const getProgressPercentage = (week: number) => {
    return (week / 7) * 100;
  };

  const renderChemistryIndicators = (chemistry: CompostingBox['chemistry']) => {
    if (!chemistry) return null;

    const indicators = [
      { label: 'pH', value: chemistry.ph, optimal: [6.5, 8.0], icon: Droplets, unit: '' },
      { label: 'N', value: chemistry.nitrogen, optimal: [1.5, 3.0], icon: Leaf, unit: '%' },
      { label: 'P', value: chemistry.phosphorus, optimal: [0.5, 1.2], icon: Zap, unit: '%' },
      { label: 'K', value: chemistry.potassium, optimal: [1.0, 2.0], icon: Zap, unit: '%' },
    ];

    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {indicators.map((indicator) => {
          const isOptimal = indicator.value >= indicator.optimal[0] && indicator.value <= indicator.optimal[1];
          const Icon = indicator.icon;
          
          return (
            <div key={indicator.label} className="flex items-center gap-1">
              <Icon className="h-3 w-3 text-white" />
              <span className="text-xs font-medium text-white">{indicator.label}:</span>
              <span className={`text-xs font-bold text-white`}>
                {indicator.value}{indicator.unit}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Processo de Compostagem</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o fluxo das 7 caixas sequenciais
        </p>
      </div>

      {/* Fluxo das Caixas */}
      <div className="relative">
        {/* Linha de conexão */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-warning via-primary to-success opacity-30 z-0" />
        
        <div className="grid grid-cols-1 gap-4 relative z-10">
          {boxes.map((box, index) => (
            <div key={box.number} className="relative">
              <Card className="glass-light organic-hover border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {box.number}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Caixa {box.number}</h3>
                        {box.status !== 'vazia' ? (
                          <div>
                            <p className="text-xs text-muted-foreground">Semana {box.week}</p>
                            {box.loteCode && (
                              <p className="text-xs font-medium">{box.loteCode}</p>
                            )}
                            {box.loteData && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(box.loteData), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Aguardando lote</p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(box.status)}>
                      {getStatusLabel(box.status)}
                    </Badge>
                  </div>

                  {/* Progresso */}
                  {box.status !== 'vazia' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progresso</span>
                        <span>{Math.round(getProgressPercentage(box.week))}%</span>
                      </div>
                      <Progress value={getProgressPercentage(box.week)} className="h-2" />
                    </div>
                  )}

                  {/* Peso */}
                  {box.status !== 'vazia' && (
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {box.weight.toFixed(1)} kg
                      </span>
                    </div>
                  )}

                  {/* Dados IoT - Temperatura (Caixa 1) */}
                  {box.temperature && (
                    <div className="flex items-center gap-2 p-2 bg-gradient-primary rounded-lg text-primary-foreground mb-2">
                      <Thermometer className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {box.temperature}°C
                      </span>
                      <span className="text-xs opacity-90">
                        Temperatura ideal
                      </span>
                    </div>
                  )}

                   {/* Dados IoT - Química (Caixa 6) */}
                   {box.chemistry && (
                     <div className="p-2 bg-gradient-earth rounded-lg text-white">
                       <div className="flex items-center gap-2 mb-2">
                         <Zap className="h-4 w-4 text-white" />
                         <span className="text-sm font-medium text-white">Análise Química</span>
                       </div>
                       {renderChemistryIndicators(box.chemistry)}
                     </div>
                   )}
                </CardContent>
              </Card>

              {/* Seta para próxima caixa */}
              {index < boxes.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <Card className="glass-light border-0">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-center">Resumo do Processo</h3>
          {loading ? (
            <div className="text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Caixas Ocupadas</p>
                <p className="font-bold text-lg">{boxes.filter(b => b.status !== 'vazia').length}/7</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peso em Esteira</p>
                <p className="font-bold text-lg text-success">
                  {boxes.reduce((acc, box) => acc + box.weight, 0).toFixed(1)} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacidade</p>
                <p className="font-bold text-lg text-earth">
                  {Math.round((boxes.filter(b => b.status !== 'vazia').length / 7) * 100)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};