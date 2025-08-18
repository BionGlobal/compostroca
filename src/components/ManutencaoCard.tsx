import { FileDown, Camera, MapPin, User, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, getOrganizationName, formatLocation } from '@/lib/organizationUtils';
import type { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface ManutencaoCardProps {
  evento: HistoricoEvent;
  onViewPhotos?: () => void;
  onDownloadPDF: () => void;
  loading?: boolean;
}

export const ManutencaoCard = ({ evento, onViewPhotos, onDownloadPDF, loading = false }: ManutencaoCardProps) => {
  const dadosManutencao = evento.dados_especificos;
  const temFotos = evento.fotos && evento.fotos.length > 0;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                🔧 Manutenção
              </Badge>
              <h3 className="font-semibold text-base sm:text-lg">{evento.lote_codigo}</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {getOrganizationName(evento.unidade)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Realizada em</p>
            <p className="text-sm font-medium">
              {new Date(evento.data).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(evento.data).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Transferência de caixas */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Caixa Origem</p>
              <p className="font-semibold text-lg">{dadosManutencao.caixa_origem}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-600" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Caixa Destino</p>
              <p className="font-semibold text-lg">{dadosManutencao.caixa_destino || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Informações principais */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Validador:</span>
            <span className="font-medium truncate">{evento.validador_nome}</span>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-muted-foreground">Peso:</span>
              <div className="font-medium">
                {formatWeight(dadosManutencao.peso_antes)} → {formatWeight(dadosManutencao.peso_depois)}
              </div>
            </div>
          </div>

          {evento.geoloc && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-muted-foreground">Local:</span>
                <div className="font-medium text-xs break-all">
                  {formatLocation(evento.geoloc.lat, evento.geoloc.lng)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Observações */}
        {dadosManutencao.observacoes && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Observações:</p>
            <p className="text-sm">{dadosManutencao.observacoes}</p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col gap-2 pt-2">
          {temFotos && onViewPhotos && (
            <Button variant="outline" size="sm" onClick={onViewPhotos} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Ver Fotos ({evento.fotos!.length})
            </Button>
          )}
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={onDownloadPDF}
            disabled={loading}
            className="w-full"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};