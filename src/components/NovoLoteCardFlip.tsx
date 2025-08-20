import React from 'react';
import { Calendar, MapPin, Users, Star, Scale, Leaf, Download, Camera, Clock } from 'lucide-react';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatWeight, formatLocation } from '@/lib/organizationUtils';
import { HistoricoEvent } from '@/hooks/useHistoricoLotes';

interface NovoLoteCardFlipProps {
  evento: HistoricoEvent;
  onViewPhotos?: () => void;
  onDownloadPDF?: () => void;
  loading?: boolean;
}

export const NovoLoteCardFlip = ({ evento, onViewPhotos, onDownloadPDF, loading }: NovoLoteCardFlipProps) => {
  const dados = evento.dados_especificos;
  const co2Evitado = (dados.peso_inicial * 0.766).toFixed(2);
  
  // Calcular data prevista de finalização (aproximadamente 8 semanas após início)
  const dataInicio = new Date(dados.data_inicio);
  const dataPrevista = new Date(dataInicio);
  dataPrevista.setDate(dataPrevista.getDate() + (8 * 7)); // 8 semanas

  const frontContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-wide">
            {evento.lote_codigo}
          </h3>
          <Badge variant="outline" className="bg-amber-500/20 text-white border-amber-300/50 text-xs font-semibold px-3 py-1 backdrop-blur-sm">
            🌱 Novo
          </Badge>
        </div>
        <div className="text-right">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs text-white/90 font-medium">Caixa 1</p>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Calendar className="w-4 h-4" />
          <span>Data/Hora: {new Date(evento.data).toLocaleDateString('pt-BR')} às {new Date(evento.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-white/90">
          <Scale className="w-4 h-4" />
          <span>Peso inicial: {dados.peso_inicial ? formatWeight(dados.peso_inicial) : 'Não informado'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/90">
          <Users className="w-4 h-4" />
          <span>Voluntários: {dados.num_voluntarios || 'Não informado'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/90">
          <Leaf className="w-4 h-4" />
          <span>Validador: {evento.validador_nome || 'Não informado'}</span>
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
        <h3 className="text-lg font-bold text-white mb-2">Detalhes do Lote</h3>
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

        <div className="text-white/90">
          <p className="text-xs mb-1">Peso inicial: {dados.peso_inicial ? formatWeight(dados.peso_inicial) : 'Não informado'}</p>
          <p className="text-xs mb-1">Peso após entregas: {dados.peso_total_entregas ? formatWeight(dados.peso_total_entregas) : 'Não informado'}</p>
          <p className="text-xs mb-1">Validador: {evento.validador_nome || 'Não informado'}</p>
        </div>

        <div className="text-white/90">
          <p className="text-xs mb-1">Voluntários participantes: {dados.num_voluntarios || 'Não informado'}</p>
          <p className="text-xs mb-1">Qualidade média: {dados.qualidade_media ? `${dados.qualidade_media}/5` : 'Não informado'}</p>
          <p className="text-xs mb-1">Linha de produção: {dados.linha_producao || 'Não informado'}</p>
        </div>

        <div className="text-white/90">
          <p className="text-xs mb-1">Semana atual: {dados.semana_atual || 'Não informado'}</p>
          <p className="text-xs">Data de início: {dados.data_inicio ? new Date(dados.data_inicio).toLocaleDateString('pt-BR') : 'Não informado'}</p>
        </div>
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
      gradientClass="bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-600"
      className="transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/25"
    />
  );
};