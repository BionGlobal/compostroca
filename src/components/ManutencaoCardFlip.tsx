import React from 'react';
import { Calendar, MapPin, User, Scale, ArrowRight, Download, Camera, Clock } from 'lucide-react';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, formatLocation } from '@/lib/organizationUtils';
import { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface ManutencaoCardFlipProps {
  evento: HistoricoEvent;
  onViewPhotos?: () => void;
  onDownloadPDF?: () => void;
  loading?: boolean;
}

export const ManutencaoCardFlip = ({ evento, onViewPhotos, onDownloadPDF, loading }: ManutencaoCardFlipProps) => {
  const dados = evento.dados_especificos;
  const pesoTotal = dados.peso_depois || dados.peso_antes;

  const frontContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
            {evento.lote_codigo}
          </h3>
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-xs">
            🔧 Manutenção
          </Badge>
        </div>
        <div className="text-right">
          <Clock className="w-6 h-6 text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Executada</p>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{new Date(evento.data).toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scale className="w-4 h-4" />
          <span>Peso total: {formatWeight(pesoTotal)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowRight className="w-4 h-4" />
          <span>Caixa {dados.caixa_origem} → {dados.caixa_destino || 'N/A'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{evento.validador_nome}</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-3 border-t border-border/20">
        <p className="text-xs text-muted-foreground">
          Toque para ver observações
        </p>
      </div>
    </div>
  );

  const backContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground mb-2">Detalhes da Manutenção</h3>
      </div>

      {/* Dados detalhados */}
      <div className="space-y-2 flex-1 text-sm">
        {evento.geoloc && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs break-all">
              {formatLocation(evento.geoloc.lat, evento.geoloc.lng)}
            </span>
          </div>
        )}

        <div className="text-muted-foreground">
          <p className="text-xs mb-1">Peso antes: {formatWeight(dados.peso_antes)}</p>
          <p className="text-xs mb-1">Peso depois: {formatWeight(dados.peso_depois)}</p>
          <p className="text-xs mb-1">Responsável: {evento.validador_nome}</p>
        </div>

        {dados.observacoes && (
          <div className="text-muted-foreground">
            <p className="text-xs font-medium mb-1">Observações:</p>
            <p className="text-xs bg-muted/30 p-2 rounded text-wrap break-words">
              {dados.observacoes}
            </p>
          </div>
        )}

        <div className="text-muted-foreground">
          <p className="text-xs font-medium mb-1">Lotes envolvidos:</p>
          <p className="text-xs">7 lotes da linha {dados.linha_producao || 'A'}</p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border/20">
        {onViewPhotos && dados.foto_url && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
            className="text-xs h-8"
          >
            <Camera className="w-3 h-3 mr-1" />
            Ver Fotos
          </Button>
        )}
        {onDownloadPDF && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onDownloadPDF(); }}
            disabled={loading}
            className="text-xs h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            {loading ? 'Gerando...' : 'PDF'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <FlippableCard
      frontContent={frontContent}
      backContent={backContent}
      gradientClass="bg-gradient-to-br from-muted to-accent"
      className="hover:scale-[1.02] transition-transform duration-200"
    />
  );
};