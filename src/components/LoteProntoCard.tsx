import React from 'react';
import { Calendar, Users, Scale, MapPin, Clock, Leaf, Hash, ShieldCheck } from "lucide-react";
import { FlippableCard } from "@/components/FlippableCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHashDisplay } from "@/lib/hashUtils";
import { useLoteHash } from "@/hooks/useLoteHash";

interface LoteProntoCardProps {
  evento: any;
  onViewPhotos?: (loteId: string, title: string) => void;
  onDownloadPDF?: (evento: any) => void;
  loading?: boolean;
}

export const LoteProntoCard: React.FC<LoteProntoCardProps> = ({
  evento,
  onViewPhotos,
  onDownloadPDF,
  loading = false
}) => {
  const { generateAndSaveHash, copyHashToClipboard, loading: hashLoading } = useLoteHash();

  const handleViewPhotos = () => {
    if (onViewPhotos) {
      onViewPhotos(evento.dados_especificos.id, `Fotos do Lote Finalizado ${evento.lote_codigo}`);
    }
  };

  const handleDownloadPDF = () => {
    if (onDownloadPDF) {
      onDownloadPDF(evento);
    }
  };

  const handleGenerateHash = async () => {
    if (!evento.hash_integridade) {
      await generateAndSaveHash(evento.dados_especificos.id);
    }
  };

  const handleCopyHash = async () => {
    if (evento.hash_integridade) {
      await copyHashToClipboard(evento.hash_integridade);
    }
  };

  const dados = evento.dados_especificos;
  const voluntarios = dados.num_voluntarios || 0;
  const co2Evitado = dados.peso_inicial ? (Number(dados.peso_inicial) * 0.766).toFixed(2) : '0';
  const reducaoPercentual = dados.peso_inicial && dados.peso_final ? 
    (((dados.peso_inicial - dados.peso_final) / dados.peso_inicial) * 100) : 0;

  const frontContent = (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            {evento.lote_codigo}
          </h3>
          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
            Finalizado
          </Badge>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
            <Leaf className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>Início: {dados.data_inicio ? new Date(dados.data_inicio).toLocaleDateString('pt-BR') : 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>Fim: {dados.data_encerramento ? new Date(dados.data_encerramento).toLocaleDateString('pt-BR') : 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Scale className="w-4 h-4" />
          <span>Peso final: {dados.peso_final ? `${dados.peso_final}kg` : 'N/A'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Users className="w-4 h-4" />
          <span>{voluntarios} voluntários</span>
        </div>
        
        {/* Indicador de Hash */}
        <div className="flex items-center gap-2 text-sm">
          {evento.hash_integridade ? (
            <div className="flex items-center gap-1 text-green-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs">Verificado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-400">
              <Hash className="w-4 h-4" />
              <span className="text-xs">Sem hash</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const backContent = (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Detalhes Completos</h3>
      </div>

      {/* Dados detalhados */}
      <div className="space-y-3 flex-1 text-sm">
        {evento.geoloc && (
          <div className="flex items-center gap-2 text-white/90">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">{evento.geoloc.lat.toFixed(6)}, {evento.geoloc.lng.toFixed(6)}</span>
          </div>
        )}

        <div className="text-white/90">
          <p className="text-xs mb-1">Peso inicial: {dados.peso_inicial ? `${dados.peso_inicial}kg` : 'N/A'}</p>
          <p className="text-xs mb-1">Peso final: {dados.peso_final ? `${dados.peso_final}kg` : 'N/A'}</p>
          {dados.peso_inicial && dados.peso_final && (
            <p className="text-xs mb-1">Redução: {reducaoPercentual.toFixed(1)}%</p>
          )}
        </div>

        <div className="text-white/90">
          <p className="text-xs mb-1">Responsável: {evento.validador_nome || 'N/A'}</p>
          <p className="text-xs mb-1">CO2e evitado: {co2Evitado} kg</p>
          <p className="text-xs">Tempo total: {dados.tempo_total || 7} semanas</p>
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-4">
        <Button 
          onClick={handleViewPhotos}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
        >
          Ver Fotos
        </Button>
        
        <Button 
          onClick={handleDownloadPDF}
          disabled={loading}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
        >
          {loading ? "Gerando..." : "Baixar PDF"}
        </Button>

        {/* Seção de Hash de Integridade */}
        <div className="pt-2 border-t border-white/20">
          {evento.hash_integridade ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <ShieldCheck className="w-4 h-4" />
                <span>Hash de Integridade</span>
              </div>
              <Button 
                onClick={handleCopyHash}
                className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 text-xs"
              >
                {formatHashDisplay(evento.hash_integridade)}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleGenerateHash}
              disabled={hashLoading}
              className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-500/30"
            >
              {hashLoading ? "Gerando..." : "Gerar Hash SHA256"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <FlippableCard
      frontContent={frontContent}
      backContent={backContent}
      gradientClass="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600"
      className="hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300"
    />
  );
};