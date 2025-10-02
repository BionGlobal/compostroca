import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Scale, Image as ImageIcon } from 'lucide-react';
import { FotosGalleryModal } from '@/components/FotosGalleryModal';

interface Evento {
  etapa: number;
  tipo: 'INICIO' | 'MANUTENCAO' | 'FINALIZACAO';
  data: Date;
  hora: string;
  validador: string;
  peso_calculado: number;
  fotos_entrega: string[];
  fotos_manejo: string[];
  comentario: string;
  nota_contexto: string;
  lote_id: string;
  manejo_id?: string | null;
}

interface TraceabilityTimelineProps {
  eventos: Evento[];
}

export const TraceabilityTimeline = ({ eventos }: TraceabilityTimelineProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [selectedManejoId, setSelectedManejoId] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('');

  const handleOpenGallery = (evento: Evento) => {
    setSelectedLoteId(evento.lote_id);
    setSelectedManejoId(evento.manejo_id || undefined);
    setModalTitle(getTipoLabel(evento.tipo, evento.etapa));
    setModalOpen(true);
  };

  const getTipoLabel = (tipo: string, etapa: number) => {
    if (tipo === 'INICIO') return 'Início do Lote';
    if (tipo === 'FINALIZACAO') return 'Lote Pronto!';
    return `Manutenção Semanal ${etapa - 1}`;
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
            Acompanhe cada etapa do processo de compostagem
          </p>
        </div>

        <div className="relative">
          {/* Linha vertical da timeline - oculta em mobile, visível de sm em diante */}
          <div className="hidden sm:block absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6 sm:space-y-8">
            {eventos.map((evento, index) => (
              <div key={index} className="relative">
                {/* Marcador da timeline - oculto em mobile */}
                <div className="hidden sm:flex absolute left-0 w-12 h-12 items-center justify-center">
                  <div className="w-10 h-10 rounded-full glass-light border-2 border-primary flex items-center justify-center font-bold text-sm text-primary">
                    {evento.etapa}
                  </div>
                </div>

                <Card className="sm:ml-16 border-l-4 border-l-primary">
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Cabeçalho do evento */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getTipoBadgeVariant(evento.tipo)} className="text-xs sm:text-sm">
                            Semana {evento.etapa - 1}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {getTipoLabel(evento.tipo, evento.etapa)}
                          </span>
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
                        </div>
                      </div>

                      {/* Peso */}
                      <div className="glass-light px-3 py-2 rounded-lg text-center self-start">
                        <div className="flex items-center gap-1 justify-center text-xs text-muted-foreground mb-1">
                          <Scale className="w-3 h-3" />
                          <span>Peso</span>
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-foreground">
                          {evento.peso_calculado.toFixed(2)} kg
                        </p>
                      </div>
                    </div>

                    {/* Galeria de fotos - Início */}
                    {evento.tipo === 'INICIO' && (
                      <div className="space-y-2">
                        {evento.fotos_entrega.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{evento.fotos_entrega.length} foto(s) das entregas</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {evento.fotos_entrega.map((foto, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleOpenGallery(evento)}
                                  className="w-[45px] h-[45px] rounded border border-border hover:border-primary transition-colors overflow-hidden"
                                >
                                  <img
                                    src={foto}
                                    alt={`Entrega ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">-</p>
                        )}
                      </div>
                    )}

                    {/* Galeria de fotos - Manutenção */}
                    {evento.tipo === 'MANUTENCAO' && (
                      <div className="space-y-2">
                        {evento.fotos_manejo.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{evento.fotos_manejo.length} foto(s) da manutenção</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {evento.fotos_manejo.map((foto, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleOpenGallery(evento)}
                                  className="w-[45px] h-[45px] rounded border border-border hover:border-primary transition-colors overflow-hidden"
                                >
                                  <img
                                    src={foto}
                                    alt={`Manutenção ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">-</p>
                        )}
                      </div>
                    )}

                    {/* Comentário */}
                    {evento.comentario && (
                      <div className="glass-light p-3 rounded-lg">
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                          {evento.comentario}
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

      {/* Modal de galeria de fotos */}
      <FotosGalleryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        loteId={selectedLoteId}
        title={modalTitle}
        isLoteProng={true}
        manejoId={selectedManejoId}
      />
    </>
  );
};
