import { FileDown, Camera, MapPin, User, Scale, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, calculateWeightReduction, getOrganizationName, formatLocation } from '@/lib/organizationUtils';
import type { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface NovoLoteCardProps {
  evento: HistoricoEvent;
  onViewPhotos?: () => void;
  onDownloadPDF: () => void;
  loading?: boolean;
}

export const NovoLoteCard = ({ evento, onViewPhotos, onDownloadPDF, loading = false }: NovoLoteCardProps) => {
  const dadosLote = evento.dados_especificos;
  const reducao = calculateWeightReduction(dadosLote.peso_inicial, dadosLote.peso_atual);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                📦 Novo Lote
              </Badge>
              <h3 className="font-semibold text-lg">{evento.lote_codigo}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {getOrganizationName(evento.unidade)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Encerrado em</p>
            <p className="text-sm font-medium">
              {new Date(evento.data).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Validador:</span>
            <span className="font-medium">{evento.validador_nome}</span>
          </div>

          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Peso:</span>
            <span className="font-medium">
              {formatWeight(dadosLote.peso_inicial)} → {formatWeight(dadosLote.peso_atual)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Semana:</span>
            <span className="font-medium">{dadosLote.semana_atual || 'N/A'}</span>
          </div>

          {evento.geoloc && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Local:</span>
              <span className="font-medium text-xs">
                {formatLocation(evento.geoloc.lat, evento.geoloc.lng)}
              </span>
            </div>
          )}
        </div>

        {/* Redução de peso */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700 dark:text-green-300">
              Redução de peso:
            </span>
            <span className="font-semibold text-green-800 dark:text-green-200">
              -{reducao.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onViewPhotos && (
            <Button variant="outline" size="sm" onClick={onViewPhotos} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Ver Fotos das Entregas
            </Button>
          )}
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={onDownloadPDF}
            disabled={loading}
            className="flex-1"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};