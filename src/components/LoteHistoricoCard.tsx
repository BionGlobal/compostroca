import { MapPin, Clock, User, Scale, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatWeight, calculateWeightReduction, calculateProcessingTime, getOrganizationName, formatLocation } from '@/lib/organizationUtils';

interface LoteHistoricoCardProps {
  lote: {
    id: string;
    codigo: string;
    unidade: string;
    status: string;
    data_inicio: string;
    data_encerramento: string | null;
    peso_inicial: number;
    peso_atual: number;
    latitude: number | null;
    longitude: number | null;
    criado_por_nome: string;
  };
  onClick: () => void;
}

export const LoteHistoricoCard = ({ lote, onClick }: LoteHistoricoCardProps) => {
  const weightReduction = calculateWeightReduction(lote.peso_inicial, lote.peso_atual);
  const processingTime = calculateProcessingTime(lote.data_inicio, lote.data_encerramento);

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border border-border/50 hover:border-primary/20"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground">{lote.codigo}</h3>
            <p className="text-sm text-muted-foreground">{getOrganizationName(lote.unidade)}</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            ✓ Distribuído
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Localização */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatLocation(lote.latitude, lote.longitude)}
          </span>
        </div>

        {/* Data de finalização */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Finalizado em {lote.data_encerramento ? new Date(lote.data_encerramento).toLocaleDateString('pt-BR') : 'N/A'}
          </span>
        </div>

        {/* Validador */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Validador: {lote.criado_por_nome}</span>
        </div>

        {/* Peso inicial/final */}
        <div className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatWeight(lote.peso_inicial)} → {formatWeight(lote.peso_atual)}
          </span>
        </div>

        {/* Redução de peso */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingDown className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-medium">
            -{weightReduction.toFixed(1)}% de redução
          </span>
        </div>

        {/* Tempo de processamento */}
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Tempo de processamento: <span className="font-medium">{processingTime}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};