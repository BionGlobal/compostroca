import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Leaf, Users, Star, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImpactMetricsProps {
  pesoInicial: number;
  pesoFinal: number;
  duracaoDias: number;
  co2eqEvitado: number;
  creditosCau: number;
  totalVoluntarios: number;
  mediaRating: number;
}

export const ImpactMetrics = ({
  pesoInicial,
  pesoFinal,
  duracaoDias,
  co2eqEvitado,
  creditosCau,
  totalVoluntarios,
  mediaRating
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
              {pesoInicial.toFixed(2)} kg
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Peso Final Estimado</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {pesoFinal.toFixed(2)} kg
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">Duração do Ciclo</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">
              {duracaoDias} dias
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs z-50">
                  <p className="text-sm">
                    Ref: Embrapa Solos 2010
                  </p>
                  <a 
                    href="https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/882162"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs mt-1 inline-block"
                  >
                    Ver documento →
                  </a>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">CO₂e Evitado</p>
            <p className="text-xl sm:text-2xl font-bold text-success">
              {co2eqEvitado.toFixed(2)} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimado
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">Créditos CAU</p>
            <p className="text-lg sm:text-xl font-semibold text-success">
              {creditosCau.toFixed(3)}
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
