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
    ph: number | null;
    nitrogen: number | null;
    phosphorus: number | null;
    potassium: number | null;
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
        ph: loteNaCaixa.ph || null,
        nitrogen: loteNaCaixa.nitrogenio ? loteNaCaixa.nitrogenio / 10 : null,
        phosphorus: loteNaCaixa.fosforo ? loteNaCaixa.fosforo / 10 : null,
        potassium: loteNaCaixa.potassio ? loteNaCaixa.potassio / 10 : null,
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

  const getProgressPercentage = (box: CompostingBox) => {
    if (box.status === 'vazia' || !box.loteData) return 0;
    
    const inicioLote = new Date(box.loteData);
    const hoje = new Date();
    const diasDecorridos = Math.floor((hoje.getTime() - inicioLote.getTime()) / (1000 * 60 * 60 * 24));
    const totalDias = 49; // 49 dias até completar o processo
    
    return Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100);
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
              <Card className="glass-light organic-hover border-0 min-h-[280px]">
                <CardContent className="p-3 h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {box.number}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Caixa {box.number}</h3>
                        {box.status !== 'vazia' ? (
                          <div>
                            <p className="text-[10px] text-muted-foreground">Semana {box.week}</p>
                            {box.loteCode && (
                              <p className="text-[10px] font-medium">{box.loteCode}</p>
                            )}
                            {box.loteData && (
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(box.loteData), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">Aguardando lote</p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(box.status)} text-[10px] px-2 py-0.5`}>
                      {getStatusLabel(box.status)}
                    </Badge>
                  </div>

                  {/* Progresso */}
                  {box.status !== 'vazia' && (
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Progresso (49 dias)</span>
                        <span>{Math.round(getProgressPercentage(box))}%</span>
                      </div>
                      <Progress value={getProgressPercentage(box)} className="h-1.5" />
                    </div>
                  )}

                  {/* Peso */}
                  {box.status !== 'vazia' && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Scale className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">
                        {box.weight.toFixed(1)} kg
                      </span>
                    </div>
                  )}

                  {/* Placeholder IoT - Caixa 2 (Termofílico) */}
                  {box.number === 2 && box.status !== 'vazia' && (
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Aguardando Dados
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500">Temp: -°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500">Umid: -%</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-[9px] text-gray-500">Cond: - mS/cm</span>
                        </div>
                      </div>
                      
                      <p className="text-[8px] text-gray-400 mt-0.5 italic text-center">
                        Coleta: 23:00 UTC
                      </p>
                    </div>
                  )}

                  {/* Dados IoT - Química (Caixa 6) */}
                  {box.number === 6 && box.status !== 'vazia' && (
                    box.chemistry ? (
                      <div className="p-1.5 bg-gradient-earth rounded-lg text-white">
                        <div className="flex items-center gap-1 mb-1">
                          <Zap className="h-3 w-3" />
                          <span className="text-[10px] font-medium">Análise Química</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div className="flex items-center gap-0.5">
                            <Droplets className="h-2.5 w-2.5" />
                            <span>pH: {box.chemistry.ph !== null ? box.chemistry.ph : '-'}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Leaf className="h-2.5 w-2.5" />
                            <span>N: {box.chemistry.nitrogen !== null ? `${box.chemistry.nitrogen}%` : '-%'}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            <span>P: {box.chemistry.phosphorus !== null ? `${box.chemistry.phosphorus}%` : '-%'}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            <span>K: {box.chemistry.potassium !== null ? `${box.chemistry.potassium}%` : '-%'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Aguardando Dados
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">pH: -</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Leaf className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">N: -%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">P: -%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">K: -%</span>
                          </div>
                        </div>
                        
                        <p className="text-[8px] text-gray-400 mt-0.5 italic text-center">
                          Coleta: 23:00 UTC
                        </p>
                      </div>
                    )
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