import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/StarRating';
import { Camera, Download, Calendar, Users, Leaf, Weight, TrendingDown, Sprout, CheckCircle, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoteData {
  id: string;
  codigo: string;
  codigo_unico?: string;
  status: string;
  caixa_atual: number;
  peso_inicial?: number | null;
  peso_atual?: number | null;
  peso_final?: number | null;
  data_inicio: string;
  data_encerramento?: string | null;
  created_at: string;
  unidade: string;
  criado_por_nome: string;
  // Dados calculados
  num_voluntarios: number;
  qualidade_media: number;
  co2e_evitado: number;
  tempo_processamento?: number; // em semanas
  taxa_reducao?: number; // percentual
  // Dados de geolocalização
  latitude?: number | null;
  longitude?: number | null;
}

interface CardHistoricoLoteProps {
  lote: LoteData;
  onViewPhotos: (loteId: string, title: string, isLoteProng?: boolean, entregaId?: string, manejoId?: string) => void;
  onDownloadPDF: () => void;
  loading?: boolean;
}

export const CardHistoricoLote: React.FC<CardHistoricoLoteProps> = ({
  lote,
  onViewPhotos,
  onDownloadPDF,
  loading = false
}) => {
  // Ajustado para considerar lotes mais recentes em processamento (qualquer caixa)
  const isNovoLote = lote.status === 'em_processamento';
  const isLoteProng = lote.status === 'encerrado';
  
  // Calcular métricas
  const pesoInicial = Number(lote.peso_inicial) || 0;
  const pesoFinal = Number(lote.peso_final || lote.peso_atual) || 0;
  const co2eEvitado = isNovoLote ? 0 : (pesoInicial * 0.766); // Apenas para lotes prontos
  const taxaReducao = pesoInicial > 0 ? ((pesoInicial - pesoFinal) / pesoInicial) * 100 : 0;
  
  // Determinar peso para exibição - corrigir divisão incorreta
  const pesoExibicao = isNovoLote ? pesoInicial : (Number(lote.peso_atual) || 0);
  
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
      isNovoLote 
        ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 border-emerald-200 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-lime-950/20' 
        : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 border-blue-200 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-teal-950/20'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge 
              variant={isNovoLote ? "default" : "secondary"}
              className={`${
                isNovoLote 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300' 
                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300'
              } font-semibold`}
            >
              <div className="flex items-center gap-1">
                {isNovoLote ? (
                  <>
                    <Sprout className="h-3 w-3" />
                    Novo Lote!
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Lote Pronto!
                  </>
                )}
              </div>
            </Badge>
            <h3 className="text-xl font-bold text-foreground">
              {lote.codigo}
            </h3>
          </div>
          
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(
                new Date(isLoteProng ? (lote.data_encerramento || lote.created_at) : lote.created_at), 
                'dd/MM/yyyy HH:mm', 
                { locale: ptBR }
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Weight className="h-4 w-4" />
              {isLoteProng ? 'Peso Final' : 'Peso Inicial'}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(pesoExibicao).toFixed(1)} kg
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Leaf className="h-4 w-4" />
              CO2e Evitado
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isNovoLote ? '-' : `${co2eEvitado.toFixed(1)} kg`}
            </p>
          </div>
        </div>

        {/* Dados secundários */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{lote.num_voluntarios} voluntário{lote.num_voluntarios !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Qualidade: {lote.qualidade_media.toFixed(1)}/3</span>
            </div>
          </div>

          {isLoteProng && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Redução
              </div>
              <p className="text-lg font-semibold text-foreground">
                {taxaReducao.toFixed(1)}%
              </p>
            </div>
          )}
        </div>


        {/* Geolocalização quando disponível */}
        {(lote.latitude && lote.longitude) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <MapPin className="h-3 w-3" />
            <span>Validado em: {lote.latitude.toFixed(6)}, {lote.longitude.toFixed(6)}</span>
          </div>
        )}

        {/* Ações - Mobile First */}
        <div className="flex flex-col gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewPhotos(
              lote.id,
              isNovoLote ? 'Fotos das Entregas' : 'Fotos do Lote Finalizado',
              isLoteProng // Passar flag para indicar tipo de lote
            )}
            className="flex-1 flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {isNovoLote ? 'Ver Fotos da Entrega' : 'Ver Todas as Fotos'}
          </Button>
          
          {isLoteProng ? (
            <Button 
              asChild
              size="sm"
              className="flex-1 flex items-center gap-2"
            >
              <Link to={`/lote/auditoria/${lote.codigo_unico || lote.codigo}`}>
                <ExternalLink className="h-4 w-4" />
                Ver Detalhes
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onDownloadPDF}
              disabled={loading}
              className="flex-1 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          )}
        </div>

        {/* Validador */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          Validador: {lote.criado_por_nome}
        </div>
      </CardContent>
    </Card>
  );
};