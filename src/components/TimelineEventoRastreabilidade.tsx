import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scale, MapPin, User, Calendar, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoteEvento } from '@/hooks/useLoteEventos';

interface TimelineEventoRastreabilidadeProps {
  evento: LoteEvento;
  isEstimado: boolean;
  index: number;
  totalEventos: number;
}

export const TimelineEventoRastreabilidade = ({
  evento,
  isEstimado,
  index,
  totalEventos
}: TimelineEventoRastreabilidadeProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'A definir';
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getTipoEventoLabel = () => {
    if (evento.tipo_evento === 'inicio') return 'Início do Lote';
    if (evento.tipo_evento === 'finalizacao') return 'Lote Pronto!';
    return `Manutenção Semanal - Semana ${evento.etapa_numero - 1}`;
  };

  const getTipoEventoColor = () => {
    if (evento.tipo_evento === 'inicio') return 'bg-green-500';
    if (evento.tipo_evento === 'finalizacao') return 'bg-blue-500';
    return 'bg-orange-500';
  };

  const getStatusBadge = () => {
    if (isEstimado) {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Estimado
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Registrado
      </Badge>
    );
  };

  return (
    <div className="relative">
      {/* Linha conectora */}
      {index < totalEventos - 1 && (
        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border -z-10" />
      )}

      <Card className={`w-full ${isEstimado ? 'opacity-60 border-dashed' : ''}`}>
        <CardContent className="p-6">
          {/* Cabeçalho do evento */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getTipoEventoColor()} flex items-center justify-center text-white font-bold text-lg`}>
              {evento.etapa_numero}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{getTipoEventoLabel()}</h3>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(evento.data_evento)}
              </div>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Peso */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Peso
              </div>
              <div className="pl-6 space-y-1">
                {evento.peso_antes !== null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Antes:</span>{' '}
                    <span className="font-medium">{evento.peso_antes.toFixed(2)} kg</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Depois:</span>{' '}
                  <span className="font-medium">{evento.peso_depois.toFixed(2)} kg</span>
                  {isEstimado && evento.dados_especificos?.estimado && (
                    <span className="text-xs text-muted-foreground ml-2">(estimado)</span>
                  )}
                </div>
                {evento.peso_antes !== null && (
                  <div className="text-xs text-muted-foreground">
                    Redução: {((evento.peso_antes - evento.peso_depois) / evento.peso_antes * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Administrador */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Responsável
              </div>
              <div className="pl-6">
                <div className="text-sm">{evento.administrador_nome}</div>
              </div>
            </div>

            {/* Geolocalização */}
            {(evento.latitude || evento.longitude) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Localização
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {evento.latitude?.toFixed(6)}, {evento.longitude?.toFixed(6)}
                </div>
              </div>
            )}

            {/* Movimentação de caixas */}
            {evento.caixa_origem && evento.caixa_destino && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Movimentação</div>
                <div className="pl-6 text-sm">
                  Caixa {evento.caixa_origem} → Caixa {evento.caixa_destino}
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          {evento.observacoes && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Observações</div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                {evento.observacoes}
              </div>
            </div>
          )}

          {/* Fotos compartilhadas */}
          {evento.fotos_compartilhadas && evento.fotos_compartilhadas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Fotos ({evento.fotos_compartilhadas.length})
              </div>
              <div className="grid grid-cols-4 gap-2">
                {evento.fotos_compartilhadas.slice(0, 4).map((foto, idx) => (
                  <div key={idx} className="aspect-square rounded overflow-hidden bg-muted">
                    <img
                      src={foto}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {evento.fotos_compartilhadas.length > 4 && (
                <div className="text-xs text-muted-foreground">
                  +{evento.fotos_compartilhadas.length - 4} fotos adicionais
                </div>
              )}
            </div>
          )}

          {/* Dados específicos do início (entregas e voluntários) */}
          {evento.tipo_evento === 'inicio' && evento.dados_especificos?.entregas && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="text-sm font-medium">Detalhes do Início</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Voluntários:</span>{' '}
                  <span className="font-medium">{evento.dados_especificos.total_voluntarios || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Resíduos:</span>{' '}
                  <span className="font-medium">{(evento.dados_especificos.peso_residuos || 0).toFixed(2)} kg</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Cepilho:</span>{' '}
                  <span className="font-medium">{(evento.dados_especificos.peso_cepilho || 0).toFixed(2)} kg</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
