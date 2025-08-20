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
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2 tracking-wide">
            {evento.lote_codigo}
          </h3>
          <Badge variant="outline" className="bg-slate-500/20 text-slate-700 border-slate-400/50 text-xs font-semibold px-3 py-1 backdrop-blur-sm">
            🔧 Manutenção
          </Badge>
        </div>
        <div className="text-right">
          <div className="w-12 h-12 rounded-full bg-slate-200/50 backdrop-blur-sm flex items-center justify-center mb-2">
            <Clock className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-xs text-slate-700 font-medium">Executada</p>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{new Date(evento.data).toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Scale className="w-4 h-4" />
          <span>Peso total: <span className="font-semibold">{formatWeight(pesoTotal)}</span></span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <ArrowRight className="w-4 h-4" />
          <span>Lotes na esteira: <span className="font-bold text-blue-600">{dados.total_lotes_esteira || 'Não informado'}</span></span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User className="w-4 h-4" />
          <span>Validador: {evento.validador_nome}</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-3 border-t border-slate-300/30">
        <p className="text-xs text-slate-600">
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

        <div className="text-slate-700">
          <p className="text-xs mb-1">Peso antes: {dados.peso_antes !== 'Não informado' ? formatWeight(dados.peso_antes) : 'Não informado'}</p>
          <p className="text-xs mb-1">Peso depois: {dados.peso_depois !== 'Não informado' ? formatWeight(dados.peso_depois) : 'Não informado'}</p>
          <p className="text-xs mb-1">Responsável: {evento.validador_nome}</p>
          <p className="text-xs mb-1">Movimento: Caixa {dados.caixa_origem} → {dados.caixa_destino}</p>
        </div>

        <div className="text-slate-700">
          <p className="text-xs font-medium mb-1">Lotes na esteira ({dados.total_lotes_esteira}):</p>
          <div className="text-xs bg-slate-100/60 p-2 rounded-lg border border-slate-200/50 max-h-16 overflow-y-auto">
            {dados.lotes_na_esteira?.map((codigo: string, index: number) => (
              <span key={index} className="inline-block mr-2 mb-1">
                {codigo}
              </span>
            )) || 'Não informado'}
          </div>
        </div>

        {dados.observacoes && dados.observacoes !== 'Não informado' && (
          <div className="text-slate-700">
            <p className="text-xs font-medium mb-1">Observações:</p>
            <p className="text-xs bg-slate-100/60 p-3 rounded-lg text-wrap break-words border border-slate-200/50 max-h-20 overflow-y-auto">
              {dados.observacoes}
            </p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-300/30">
        {onViewPhotos && dados.foto_url && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
            className="text-xs h-8 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
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
            className="text-xs h-8 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
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
      gradientClass="bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100"
      className="transition-all duration-300 hover:shadow-2xl hover:shadow-slate-400/20"
    />
  );
};