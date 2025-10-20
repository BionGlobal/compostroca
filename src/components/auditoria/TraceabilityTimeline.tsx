import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Scale, Image as ImageIcon, MapPin, AlertTriangle, ExternalLink, Activity, Thermometer, Droplets, Zap, Leaf, FlaskConical } from 'lucide-react';
import { validarGeolocalizacao, gerarLinkGoogleMaps } from '@/lib/geoUtils';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';

interface Evento {
  semana: number; // 0-7
  tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO';
  data: Date;
  hora: string;
  validador: string;
  peso_calculado: number;
  fotos: string[];
  comentario: string;
  nota_contexto: string;
  lote_id: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface MediasSensores {
  media_temperatura_semana2?: number | null;
  media_umidade_semana2?: number | null;
  media_condutividade_semana2?: number | null;
  media_nitrogenio_semana6?: number | null;
  media_fosforo_semana6?: number | null;
  media_potassio_semana6?: number | null;
  media_ph_semana6?: number | null;
}

interface TraceabilityTimelineProps {
  eventos: Evento[];
  unidadeLatitude?: number | null;
  unidadeLongitude?: number | null;
  mediasSensores?: MediasSensores | null;
}

export const TraceabilityTimeline = ({ 
  eventos, 
  unidadeLatitude, 
  unidadeLongitude,
  mediasSensores
}: TraceabilityTimelineProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [modalTitle, setModalTitle] = useState('');
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[] | undefined>(undefined);

  const handleOpenGallery = (evento: Evento) => {
    setSelectedLoteId(evento.lote_id);
    setModalTitle(getTipoLabel(evento.tipo, evento.semana));
    setSelectedPhotoUrls(evento.fotos.length > 0 ? evento.fotos : undefined);
    setModalOpen(true);
  };

  const getTipoLabel = (tipo: string, semana: number) => {
    if (tipo === 'INICIO') return 'Semana 0 - Entrega';
    if (tipo === 'FINALIZACAO') return 'Semana 7 - Lote Pronto!';
    return `Semana ${semana} - Manutenção`;
  };

  const getTipoBadgeVariant = (tipo: string) => {
    if (tipo === 'INICIO') return 'default';
    if (tipo === 'FINALIZACAO') return 'success';
    return 'secondary';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Trilha de Rastreabilidade
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe cada semana do processo de compostagem
          </p>
        </div>

        <div className="relative">
          {/* Linha vertical da timeline */}
          <div className="hidden sm:block absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6 sm:space-y-8">
            {eventos.map((evento, index) => (
              <div key={index} className="relative">
                {/* Marcador da timeline */}
                <div className="hidden sm:flex absolute left-0 w-12 h-12 items-center justify-center">
                  <div className="w-10 h-10 rounded-full glass-light border-2 border-primary flex items-center justify-center font-bold text-sm text-primary">
                    {evento.semana}
                  </div>
                </div>

                <Card className="sm:ml-16 border-l-4 border-l-primary">
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Cabeçalho do evento */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getTipoBadgeVariant(evento.tipo)} className="text-xs sm:text-sm">
                            {getTipoLabel(evento.tipo, evento.semana)}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{formatDate(evento.data)} às {evento.hora}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{evento.validador}</span>
                          </div>
                          {(evento.latitude != null && evento.longitude != null) ? (
                            <>
                              {(() => {
                                const validacao = validarGeolocalizacao(
                                  unidadeLatitude,
                                  unidadeLongitude,
                                  evento.latitude,
                                  evento.longitude,
                                  300 // raio de 300m
                                );

                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="font-mono text-xs">
                                        {evento.latitude.toFixed(6)}, {evento.longitude.toFixed(6)}
                                      </span>
                                    </div>
                                    
                                    {/* Ícone de alerta se fora do raio */}
                                    {validacao.valido && validacao.foraDaUnidade && (
                                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
                                    )}
                                    
                                    {/* Link para Google Maps */}
                                    <a
                                      href={gerarLinkGoogleMaps(evento.latitude, evento.longitude)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1 text-xs"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      ver no mapa
                                    </a>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Sem geolocalização registrada
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Peso */}
                      <div className="glass-light px-3 py-2 rounded-lg text-center self-start">
                        <div className="flex items-center gap-1 justify-center text-xs text-muted-foreground mb-1">
                          <Scale className="w-3 h-3" />
                          <span>Peso</span>
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-foreground">
                          {evento.peso_calculado.toFixed(3)} kg
                        </p>
                      </div>
                    </div>

                    {/* Médias de Sensores (Semana 2) */}
                    {evento.semana === 2 && mediasSensores && (
                      mediasSensores.media_temperatura_semana2 !== null || 
                      mediasSensores.media_umidade_semana2 !== null || 
                      mediasSensores.media_condutividade_semana2 !== null
                    ) && (
                      <div className="glass-light p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Médias da Semana 2 (Sensores IoT)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          {mediasSensores.media_temperatura_semana2 !== null && (
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Temperatura</p>
                                <p className="font-medium">{mediasSensores.media_temperatura_semana2.toFixed(1)}°C</p>
                              </div>
                            </div>
                          )}
                          {mediasSensores.media_umidade_semana2 !== null && (
                            <div className="flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Umidade</p>
                                <p className="font-medium">{mediasSensores.media_umidade_semana2.toFixed(1)}%</p>
                              </div>
                            </div>
                          )}
                          {mediasSensores.media_condutividade_semana2 !== null && (
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Condutividade</p>
                                <p className="font-medium">{mediasSensores.media_condutividade_semana2.toFixed(2)} mS/cm</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Médias de Sensores (Semana 6) */}
                    {evento.semana === 6 && mediasSensores && (
                      mediasSensores.media_nitrogenio_semana6 !== null || 
                      mediasSensores.media_fosforo_semana6 !== null || 
                      mediasSensores.media_potassio_semana6 !== null || 
                      mediasSensores.media_ph_semana6 !== null
                    ) && (
                      <div className="glass-light p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">
                            Médias da Semana 6 (Sensores IoT)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {(mediasSensores.media_nitrogenio_semana6 !== null || 
                            mediasSensores.media_fosforo_semana6 !== null || 
                            mediasSensores.media_potassio_semana6 !== null) && (
                            <div className="flex items-center gap-2">
                              <Leaf className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">NPK</p>
                                <p className="font-medium font-mono">
                                  {mediasSensores.media_nitrogenio_semana6?.toFixed(0) || '-'}/
                                  {mediasSensores.media_fosforo_semana6?.toFixed(0) || '-'}/
                                  {mediasSensores.media_potassio_semana6?.toFixed(0) || '-'}
                                </p>
                              </div>
                            </div>
                          )}
                          {mediasSensores.media_ph_semana6 !== null && (
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">pH</p>
                                <p className="font-medium">{mediasSensores.media_ph_semana6.toFixed(1)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Galeria de fotos */}
                    <div className="space-y-2">
                      {evento.fotos.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{evento.fotos.length} foto(s)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {evento.fotos.map((foto, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleOpenGallery(evento)}
                                className="w-[45px] h-[45px] rounded border border-border hover:border-primary transition-colors overflow-hidden"
                              >
                                <img
                                  src={foto}
                                  alt={`${getTipoLabel(evento.tipo, evento.semana)} ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Sem fotos registradas nesta etapa
                        </p>
                      )}
                    </div>

                    {/* Comentário */}
                    {evento.comentario && (
                      <div className="glass-light p-3 rounded-lg">
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                          {evento.comentario}
                        </p>
                      </div>
                    )}

                    {/* Nota de contexto (se houver) */}
                    {evento.nota_contexto && (
                      <div className="border-l-2 border-warning pl-3">
                        <p className="text-xs text-warning">
                          {evento.nota_contexto}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de galeria */}
      <FotosGalleryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        loteId={selectedLoteId}
        title={modalTitle}
        isLoteProng={true}
        photoUrls={selectedPhotoUrls}
      />
    </>
  );
};
