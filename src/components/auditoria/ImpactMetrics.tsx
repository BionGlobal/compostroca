import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Leaf, Users, Star, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface ImpactMetricsProps {
  pesoInicial: number;
  pesoFinal: number;
  duracaoDias: number;
  diaAtualCiclo: number;
  totalDiasCiclo: number;
  co2eqEvitado: number;
  creditosCau: number;
  totalVoluntarios: number;
  mediaRating: number;
  statusLote: 'em_producao' | 'certificado';
}

export const ImpactMetrics = ({
  pesoInicial,
  pesoFinal,
  duracaoDias,
  diaAtualCiclo,
  totalDiasCiclo,
  co2eqEvitado,
  creditosCau,
  totalVoluntarios,
  mediaRating,
  statusLote
}: ImpactMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1: Peso & Duração */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Processo de Compostagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Peso Inicial</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {pesoInicial.toFixed(3)} kg
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Peso Final Estimado</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {pesoFinal.toFixed(3)} kg
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">Duração do Ciclo</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              Dia {diaAtualCiclo} de {totalDiasCiclo}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Impacto Ambiental */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            Impacto Ambiental
            <Badge 
              variant={statusLote === 'certificado' ? 'success' : 'warning'}
              className="ml-auto"
            >
              {statusLote === 'certificado' ? 'Final' : 'Estimado'}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className="inline-flex items-center justify-center rounded-full hover:bg-accent/50 transition-colors p-1 touch-manipulation"
                  aria-label="Ver referência"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-80 z-50">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Ref: Embrapa Solos 2010
                  </p>
                  <a 
                    href="https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/882162"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs inline-block"
                  >
                    Ver documento completo →
                  </a>
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">CO₂e Evitado</p>
            <p className="text-xl sm:text-2xl font-bold text-success">
              {co2eqEvitado.toFixed(3)} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusLote === 'certificado' ? 'Confirmado' : 'Estimado'}
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">Créditos CAU</p>
            <p className="text-lg sm:text-xl font-semibold text-success">
              {creditosCau.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Créditos de Compostagem + Agricultura Urbana
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Comunidade */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Participação Comunitária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Voluntários Participantes</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {totalVoluntarios}
            </p>
          </div>
          {mediaRating > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Qualidade Média dos Resíduos
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= mediaRating
                          ? 'fill-warning text-warning'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {mediaRating.toFixed(1)}/3
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
