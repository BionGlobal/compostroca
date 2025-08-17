import { FileDown, Award, MapPin, User, Scale, Clock, Leaf } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, getOrganizationName, formatLocation } from '@/lib/organizationUtils';
import type { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface LoteFinalizadoCardProps {
  evento: HistoricoEvent;
  onDownloadPDF: () => void;
  onDownloadExcel?: () => void;
  loading?: boolean;
}

export const LoteFinalizadoCard = ({ 
  evento, 
  onDownloadPDF, 
  onDownloadExcel, 
  loading = false 
}: LoteFinalizadoCardProps) => {
  const dadosLote = evento.dados_especificos;
  const co2Evitado = (dadosLote.peso_inicial * 0.766).toFixed(1);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                ✅ Finalizado
              </Badge>
              <h3 className="font-semibold text-lg">{evento.lote_codigo}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {getOrganizationName(evento.unidade)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Finalizado em</p>
            <p className="text-sm font-medium">
              {new Date(evento.data).toLocaleDateString('pt-BR')}
            </p>
            {dadosLote.tempo_total && (
              <p className="text-xs text-muted-foreground mt-1">
                {dadosLote.tempo_total} semanas
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
            <Scale className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-xs text-muted-foreground">Peso Final</p>
            <p className="font-semibold text-lg">{formatWeight(dadosLote.peso_final)}</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-center">
            <Award className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-xs text-muted-foreground">Redução</p>
            <p className="font-semibold text-lg text-green-700 dark:text-green-300">
              -{dadosLote.reducao_peso.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Informações do processo */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Validador:</span>
            <span className="font-medium">{evento.validador_nome}</span>
          </div>

          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ciclo completo:</span>
            <span className="font-medium">
              {formatWeight(dadosLote.peso_inicial)} → {formatWeight(dadosLote.peso_final)}
            </span>
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

        {/* Impacto ambiental */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Impacto Ambiental
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">CO2e evitado:</p>
              <p className="font-medium">{co2Evitado} kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Composto produzido:</p>
              <p className="font-medium">{formatWeight(dadosLote.peso_final)}</p>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
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
          
          {onDownloadExcel && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownloadExcel}
              disabled={loading}
              className="flex-1"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};