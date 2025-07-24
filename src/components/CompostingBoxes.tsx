import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowDown, Thermometer, Beaker } from 'lucide-react';

interface CompostingBox {
  number: number;
  weight: number;
  status: 'active' | 'maturing' | 'testing' | 'ready';
  week: number;
  temperature?: number;
  chemistry?: {
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

export const CompostingBoxes = () => {
  const initialWeight = 150;

  const calculateWeight = (week: number) => {
    if (week === 1) return initialWeight;
    return Math.round(initialWeight * Math.pow(0.968, week - 1));
  };

  const boxes: CompostingBox[] = [
    { number: 1, weight: calculateWeight(1), status: 'active', week: 1, temperature: 45 },
    { number: 2, weight: calculateWeight(2), status: 'maturing', week: 2 },
    { number: 3, weight: calculateWeight(3), status: 'maturing', week: 3 },
    { number: 4, weight: calculateWeight(4), status: 'maturing', week: 4 },
    { number: 5, weight: calculateWeight(5), status: 'maturing', week: 5 },
    { number: 6, weight: calculateWeight(6), status: 'testing', week: 6, chemistry: { ph: 7.2, nitrogen: 2.1, phosphorus: 0.8, potassium: 1.5 } },
    { number: 7, weight: calculateWeight(7), status: 'ready', week: 7 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-warning text-warning-foreground';
      case 'maturing': return 'bg-primary text-primary-foreground';
      case 'testing': return 'bg-accent text-accent-foreground';
      case 'ready': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'maturing': return 'Maturando';
      case 'testing': return 'Testando';
      case 'ready': return 'Pronta';
      default: return status;
    }
  };

  const getProgressPercentage = (week: number) => {
    return (week / 7) * 100;
  };

  const renderChemistryIndicators = (chemistry: CompostingBox['chemistry']) => {
    if (!chemistry) return null;

    const indicators = [
      { label: 'pH', value: chemistry.ph, optimal: [6.5, 7.5], icon: '⚗️', gradient: 'from-blue-400 to-blue-600' },
      { label: 'N', value: chemistry.nitrogen, optimal: [1.5, 3.0], icon: '🌱', gradient: 'from-green-400 to-green-600' },
      { label: 'P', value: chemistry.phosphorus, optimal: [0.5, 1.5], icon: '💜', gradient: 'from-purple-400 to-purple-600' },
      { label: 'K', value: chemistry.potassium, optimal: [1.0, 2.0], icon: '🔸', gradient: 'from-orange-400 to-orange-600' },
    ];

    return (
      <div className="grid grid-cols-2 gap-2">
        {indicators.map(({ label, value, optimal, icon, gradient }) => {
          const isOptimal = value >= optimal[0] && value <= optimal[1];
          const percentage = Math.min((value / optimal[1]) * 100, 100);
          
          return (
            <div key={label} className="glass-light rounded-lg p-2 tech-hover">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <span className={`text-xs font-bold ${isOptimal ? 'text-success' : 'text-warning'}`}>
                  {value}
                </span>
              </div>
              
              {/* Circular progress indicator */}
              <div className="relative w-8 h-8 mx-auto">
                <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted/30"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`${isOptimal ? 'text-success' : 'text-warning'} transition-all duration-500`}
                    strokeDasharray={`${(percentage / 100) * 75.4} 75.4`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-1 h-1 rounded-full ${isOptimal ? 'bg-success' : 'bg-warning'} pulse-glow`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div className="text-center space-y-4 fade-in-up">
        <h2 className="text-3xl font-bold text-gradient-primary">
          Processo de Compostagem
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Acompanhe o ciclo completo de transformação dos resíduos orgânicos através de nossa tecnologia IoT avançada
        </p>
      </div>

      {/* Main composting flow */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
          {boxes.map((box, index) => (
            <div key={box.number} className="relative scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className={`relative h-80 ${getStatusColor(box.status)} rounded-2xl glass-card tech-hover overflow-hidden group`}>
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
                
                {/* Main content */}
                <div className="relative z-10 p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="glass-light px-3 py-1 rounded-full">
                      <span className="text-sm font-bold text-gradient-primary">Box {box.number}</span>
                    </div>
                    <Badge className={`${getStatusColor(box.status)} glass-light border-0 pulse-glow`}>
                      {getStatusLabel(box.status)}
                    </Badge>
                  </div>

                  {/* Week indicator */}
                  <div className="text-center mb-4">
                    <div className="text-xs text-muted-foreground mb-1">Semana</div>
                    <div className="text-2xl font-bold text-gradient-accent">{box.week}</div>
                  </div>

                  {/* Weight display */}
                  <div className="text-center mb-4 flex-1 flex flex-col justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-2 rounded-full glass-strong flex items-center justify-center">
                        <div className="text-lg font-bold text-gradient-primary">{box.weight}kg</div>
                      </div>
                      <div className="w-full bg-muted/20 rounded-full h-2">
                        <div 
                          className="bg-gradient-accent h-2 rounded-full transition-all duration-1000 shimmer"
                          style={{ width: `${getProgressPercentage(box.week)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* IoT Data */}
                  {box.temperature && (
                    <div className="glass-light rounded-xl p-3 mb-2 tech-hover">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-orange-500 pulse-glow" />
                          <span className="text-xs text-muted-foreground">Temperatura</span>
                        </div>
                        <span className="text-sm font-bold text-orange-500">{box.temperature}°C</span>
                      </div>
                      <div className="mt-2 w-full bg-muted/30 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-red-500 h-1 rounded-full"
                          style={{ width: `${(box.temperature / 60) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {box.chemistry && (
                    <div className="space-y-2">
                      <div className="text-xs text-center text-muted-foreground mb-2">Análise Química</div>
                      {renderChemistryIndicators(box.chemistry)}
                    </div>
                  )}
                </div>

                {/* Floating particles for active boxes */}
                {box.status === 'active' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 w-2 h-2 bg-primary/40 rounded-full particle" />
                    <div className="absolute bottom-6 right-6 w-1 h-1 bg-accent/60 rounded-full particle" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-secondary/50 rounded-full particle" style={{ animationDelay: '4s' }} />
                  </div>
                )}
              </div>

              {/* Connection arrows */}
              {index < boxes.length - 1 && (
                <div className="hidden xl:block absolute -right-8 top-1/2 transform -translate-y-1/2 z-20">
                  <div className="glass-light rounded-full p-2">
                    <ArrowRight className="h-5 w-5 text-primary pulse-glow" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Connecting line for mobile */}
        <div className="xl:hidden mt-6 flex justify-center">
          <div className="flex flex-col items-center space-y-2">
            {Array.from({ length: boxes.length - 1 }).map((_, i) => (
              <ArrowDown key={i} className="h-5 w-5 text-primary/60 float" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 scale-in" style={{ animationDelay: '0.8s' }}>
        <div className="glass-card rounded-2xl p-6 text-center tech-hover">
          <div className="text-3xl font-bold text-gradient-primary mb-2">150kg</div>
          <div className="text-sm text-muted-foreground">Peso Inicial</div>
          <div className="mt-2 w-full bg-muted/20 rounded-full h-1">
            <div className="bg-gradient-primary h-1 rounded-full w-full" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center tech-hover">
          <div className="text-3xl font-bold text-gradient-accent mb-2">117kg</div>
          <div className="text-sm text-muted-foreground">Peso Final</div>
          <div className="mt-2 w-full bg-muted/20 rounded-full h-1">
            <div className="bg-gradient-accent h-1 rounded-full w-3/4" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center tech-hover">
          <div className="text-3xl font-bold text-success mb-2">22%</div>
          <div className="text-sm text-muted-foreground">Redução Total</div>
          <div className="mt-2 w-full bg-muted/20 rounded-full h-1">
            <div className="bg-gradient-to-r from-success to-primary h-1 rounded-full w-1/4" />
          </div>
        </div>
      </div>
    </div>
  );
};