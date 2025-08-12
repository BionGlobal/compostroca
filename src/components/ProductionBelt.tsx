import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, Package, Settings, Thermometer, Droplets } from 'lucide-react';
import { LoteExtended } from '@/hooks/useLotesManager';

interface ProductionBeltProps {
  lotesAtivos: LoteExtended[];
  onManejoClick: (lote: LoteExtended) => void;
  onFinalizarClick: (lote: LoteExtended) => void;
  maintenanceState?: 'none' | 'in_progress' | 'post_maintenance';
}

export const ProductionBelt = ({ lotesAtivos, onManejoClick, onFinalizarClick, maintenanceState = 'none' }: ProductionBeltProps) => {
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

  // Helpers
  const getPhaseLabel = (box: number) => {
    if (box === 1) return 'Mesofílica';
    if (box >= 2 && box <= 5) return 'Termofílico';
    return 'Maturação';
  };

  const getDotClass = (box: number, hasLote: boolean) => {
    if (!hasLote) return 'bg-muted';
    if (maintenanceState === 'in_progress') return 'bg-destructive shadow-[0_0_16px_hsl(var(--destructive))]';
    if (maintenanceState === 'post_maintenance') {
      return box === 1
        ? 'bg-warning shadow-[0_0_16px_hsl(var(--warning))]'
        : 'bg-success shadow-[0_0_16px_hsl(var(--success))]';
    }
    return 'bg-success shadow-[0_0_16px_hsl(var(--success))]';
  };

  const daysElapsed = (startISO?: string) => {
    if (!startISO) return 1;
    const start = new Date(startISO);
    const now = new Date();
    const diff = Math.max(0, now.getTime() - start.getTime());
    const days = Math.min(49, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1));
    return days;
  };

  const playFlipSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(480, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const BoxFlipCard = ({ numeroBox, lote }: { numeroBox: number; lote?: LoteExtended }) => {
    const [flipped, setFlipped] = useState(false);

    const hasLote = !!lote;
    const day = hasLote ? daysElapsed(lote!.data_inicio) : 0;
    const progress = hasLote ? Math.round((day / 49) * 100) : 0;

    const toggle = () => {
      if (!hasLote) return;
      playFlipSound();
      setFlipped((f) => !f);
    };

    return (
      <div className="relative w-36 sm:w-44 md:w-56 aspect-square [perspective:1000px] select-none">
        <div
          onClick={toggle}
          className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front */}
          <Card className={`absolute inset-0 rounded-2xl overflow-hidden border ${getBoxColor(numeroBox, lote)} [backface-visibility:hidden]`}>
            <CardContent className="p-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Caixa {numeroBox}</span>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ring-2 ring-background ${getDotClass(numeroBox, hasLote)} animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]`} />
              </div>

              {hasLote ? (
                <div className="mt-2 flex-1 flex flex-col gap-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Lote</p>
                    <p className="text-sm font-bold truncate">{lote!.codigo}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Peso atual</p>
                      <p className="text-base font-semibold">{(lote!.peso_atual || 0).toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Início</p>
                      <p className="text-xs font-medium">{formatarData(lote!.data_inicio)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      {getPhaseLabel(numeroBox)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{day} de 49 dias</span>
                  </div>

                  {numeroBox === 1 && (
                    <div className="mt-1 text-xs flex items-center justify-center gap-2 bg-muted/40 rounded-md py-1">
                      <Thermometer className="h-3.5 w-3.5" />
                      <span>{lote!.temperatura}°C</span>
                    </div>
                  )}
                  {numeroBox === 6 && (
                    <div className="mt-1 text-[11px] grid grid-cols-3 gap-1 bg-muted/40 rounded-md p-2 text-center">
                      <div>pH {lote!.ph}</div>
                      <div>N {lote!.nitrogenio}</div>
                      <div>P {lote!.fosforo} · K {lote!.potassio}</div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    <p className="text-sm">Caixa vazia</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 rounded-2xl overflow-hidden border glass-light [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <CardContent className="p-3 h-full flex flex-col gap-2">
              {hasLote ? (
                <>
                  <div className="text-xs font-medium">Caixa {numeroBox} · {lote!.codigo}</div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Peso inicial</p>
                      <p className="text-sm font-semibold">{(lote!.peso_inicial || 0).toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Peso atual</p>
                      <p className="text-sm font-semibold">{(lote!.peso_atual || 0).toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Estimado final</p>
                      <p className="text-sm font-semibold">{(lote!.pesoEsperadoFinal || 0).toFixed(1)} kg</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Início</p>
                      <p className="font-medium">{formatarData(lote!.data_inicio)} {formatarHora(lote!.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conclusão prevista</p>
                      <p className="font-medium">
                        {formatarData(new Date(new Date(lote!.data_inicio).getTime() + 49 * 24 * 60 * 60 * 1000).toISOString())}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Voluntários</p>
                      <p className="font-medium">{lote!.voluntariosUnicos || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Validador</p>
                      <p className="font-medium truncate">{lote!.validadorNome}</p>
                    </div>
                  </div>

                  <div className="mt-1 border border-dashed rounded-md h-16 flex items-center justify-center text-xs text-muted-foreground">
                    QR Code
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); /* toast elsewhere */ }}>
                      Fotos
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                      Baixar PDF
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {caixasPorLote.map(({ numeroBox, lote }) => (
          <BoxFlipCard key={numeroBox} numeroBox={numeroBox} lote={lote} />
        ))}
      </div>
    </div>
  );
};