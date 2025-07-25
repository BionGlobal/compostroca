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

interface CompostingBox {
  number: number;
  weight: number; // kg
  status: 'iniciada' | 'maturando' | 'pronta' | 'distribuida';
  week: number;
  temperature?: number; // Apenas na caixa 1
  chemistry?: {
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  }; // Apenas na caixa 6
}

export const CompostingBoxes = () => {
  // Simulação do peso inicial baseado nas entregas
  const initialWeight = 48.5; // kg - peso das entregas da semana
  
  // Cálculo do peso com redução de 3.2% por semana
  const calculateWeight = (week: number) => {
    if (week === 1) return initialWeight;
    return initialWeight * Math.pow(0.968, week - 1); // 3.2% de redução por semana
  };

  const boxes: CompostingBox[] = [
    {
      number: 1,
      weight: calculateWeight(1),
      status: 'iniciada',
      week: 1,
      temperature: 55, // °C - temperatura IoT
    },
    {
      number: 2,
      weight: calculateWeight(2),
      status: 'maturando',
      week: 2,
    },
    {
      number: 3,
      weight: calculateWeight(3),
      status: 'maturando',
      week: 3,
    },
    {
      number: 4,
      weight: calculateWeight(4),
      status: 'maturando',
      week: 4,
    },
    {
      number: 5,
      weight: calculateWeight(5),
      status: 'maturando',
      week: 5,
    },
    {
      number: 6,
      weight: calculateWeight(6),
      status: 'maturando',
      week: 6,
      chemistry: {
        ph: 7.2,
        nitrogen: 2.1,
        phosphorus: 0.8,
        potassium: 1.5,
      }
    },
    {
      number: 7,
      weight: calculateWeight(7),
      status: 'pronta',
      week: 7,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'iniciada':
        return 'bg-warning text-warning-foreground';
      case 'maturando':
        return 'bg-primary text-primary-foreground';
      case 'pronta':
        return 'bg-success text-success-foreground';
      case 'distribuida':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'iniciada': return 'Iniciada';
      case 'maturando': return 'Maturando';
      case 'pronta': return 'Pronta';
      case 'distribuida': return 'Distribuída';
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
                        <p className="text-xs text-muted-foreground">Semana {box.week}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(box.status)}>
                      {getStatusLabel(box.status)}
                    </Badge>
                  </div>

                  {/* Progresso */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso</span>
                      <span>{Math.round(getProgressPercentage(box.week))}%</span>
                    </div>
                    <Progress value={getProgressPercentage(box.week)} className="h-2" />
                  </div>

                  {/* Peso */}
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {box.weight.toFixed(1)} kg
                    </span>
                    {index > 0 && (
                      <span className="text-xs text-success">
                        (-{(((boxes[index-1]?.weight || 0) - box.weight) / (boxes[index-1]?.weight || 1) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>

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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Peso Inicial</p>
              <p className="font-bold text-lg">{initialWeight} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso Final</p>
              <p className="font-bold text-lg text-success">{calculateWeight(7).toFixed(1)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Redução</p>
              <p className="font-bold text-lg text-earth">
                {Math.round((1 - calculateWeight(7) / initialWeight) * 100)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};