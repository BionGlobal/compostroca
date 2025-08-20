import React from 'react';
import { Calendar, MapPin, Users, Star, Scale, TrendingDown, Leaf, Download, Camera } from 'lucide-react';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, formatLocation, calculateWeightReduction } from '@/lib/organizationUtils';
import { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface LoteProntoCardProps {
  evento: HistoricoEvent;
  onViewPhotos?: () => void;
  onDownloadPDF?: () => void;
  loading?: boolean;
}

export const LoteProntoCard = ({ evento, onViewPhotos, onDownloadPDF, loading }: LoteProntoCardProps) => {
  const dados = evento.dados_especificos;
  const co2Evitado = (dados.peso_inicial * 0.766).toFixed(2);
  const reducaoPercentual = calculateWeightReduction(dados.peso_inicial, dados.peso_final);

  const frontContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-wide">
            {evento.lote_codigo}
          </h3>
          <Badge variant="outline" className="bg-emerald-500/20 text-white border-emerald-300/50 text-xs font-semibold px-3 py-1 backdrop-blur-sm">
            ✅ Lote Pronto
          </Badge>
        </div>
        <div className="text-right">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs text-white/90 font-medium">Distribuído</p>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Calendar className="w-4 h-4" />
          <span>Finalizado: {new Date(dados.data_encerramento).toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Scale className="w-4 h-4" />
          <span>{formatWeight(dados.peso_inicial)} → {formatWeight(dados.peso_final)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/90">
          <TrendingDown className="w-4 h-4 text-white" />
          <span className="font-semibold">-{reducaoPercentual.toFixed(1)}% redução</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/90">
          <Leaf className="w-4 h-4" />
          <span className="font-semibold">{co2Evitado} kg CO2e evitado</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-3 border-t border-white/20">
        <p className="text-xs text-white/70">
          Toque para ver mais detalhes
        </p>
      </div>
    </div>
  );

  const backContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Detalhes Completos</h3>
      </div>

      {/* Dados detalhados */}
      <div className="space-y-2 flex-1 text-sm">
        {evento.geoloc && (
          <div className="flex items-start gap-2 text-white/90">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs break-all">
              {formatLocation(evento.geoloc.lat, evento.geoloc.lng)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-white/90">
          <Users className="w-4 h-4" />
          <span className="text-xs">Voluntários: {dados.num_voluntarios || 'N/A'}</span>
        </div>

        <div className="flex items-center gap-2 text-white/90">
          <Star className="w-4 h-4" />
          <span className="text-xs">Qualidade média: {dados.qualidade_media || 'N/A'}/5</span>
        </div>

        <div className="text-white/90">
          <p className="text-xs mb-1">Validador: {evento.validador_nome}</p>
        </div>

        {dados.dados_iot && (
          <div className="text-white/90">
            <p className="text-xs font-medium mb-1">Dados IoT:</p>
            <p className="text-xs">NPK: {dados.dados_iot.npk || 'N/A'}</p>
            <p className="text-xs">Umidade: {dados.dados_iot.umidade || 'N/A'}%</p>
            <p className="text-xs">Condutividade: {dados.dados_iot.condutividade || 'N/A'}</p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/20">
        {onViewPhotos && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onViewPhotos(); }}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30 text-xs h-8"
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
            className="bg-white/20 border-white/30 text-white hover:bg-white/30 text-xs h-8"
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
      gradientClass="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"
      className="transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/25"
    />
  );
};