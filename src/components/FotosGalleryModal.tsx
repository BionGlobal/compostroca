import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Calendar, Camera, AlertCircle, FileImage, Download, Archive, Grid, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLoteFotos, LoteFoto } from '@/hooks/useLoteFotos';
import { useLoteProntoFotos, LoteProntoFoto } from '@/hooks/useLoteProntoFotos';
import { useZipDownload } from '@/hooks/useZipDownload';
import { supabase } from '@/integrations/supabase/client';

interface FotosGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  title: string;
  isLoteProng?: boolean; // Indica se é um lote encerrado (pronto)
  entregaId?: string;
  manejoId?: string;
}

const TIPO_FOTO_LABELS = {
  'entrega_conteudo': 'Conteúdo da Entrega',
  'entrega_pesagem': 'Pesagem',
  'entrega_destino': 'Destino',
  'manejo_semanal': 'Manejo Semanal'
} as const;

export const FotosGalleryModal: React.FC<FotosGalleryModalProps> = ({
  isOpen,
  onClose,
  loteId,
  title,
  isLoteProng = false,
  entregaId,
  manejoId
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');

  // Usar hooks baseado no tipo de lote
  const { fotos: fotosNovos, loading: loadingNovos, getFotoUrl: getFotoUrlNovos } = useLoteFotos(!isLoteProng ? loteId : undefined);
  const { fotos: fotosProntos, loading: loadingProntos, getFotoUrl: getFotoUrlProntos } = useLoteProntoFotos(isLoteProng ? loteId : undefined);
  const { downloadPhotosAsZip, loading: zipLoading } = useZipDownload();
  
  // Selecionar fotos e funções baseado no tipo de lote
  const fotos = isLoteProng ? fotosProntos : fotosNovos;
  const loading = isLoteProng ? loadingProntos : loadingNovos;
  const getFotoUrl = isLoteProng ? getFotoUrlProntos : getFotoUrlNovos;
  
  // Filtrar fotos baseado nos parâmetros (se especificados)
  const filteredFotos = fotos.filter((foto: any) => {
    if (entregaId) return foto.entrega_id === entregaId;
    if (manejoId) return foto.manejo_id === manejoId;
    return true; // Mostrar todas as fotos se nenhum filtro especificado
  }).map((foto: any) => ({
    ...foto,
    foto_url: typeof getFotoUrl === 'function' ? getFotoUrl(foto.foto_url) : foto.foto_url
  }));

  const currentFoto = filteredFotos[currentIndex];

  const nextFoto = () => {
    if (currentIndex < filteredFotos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageError(null);
      setIsLoading(true);
    }
  };

  const prevFoto = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageError(null);
      setIsLoading(true);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(null);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Erro ao carregar imagem:', currentFoto?.foto_url);
    setIsLoading(false);
    setImageError('Erro ao carregar a imagem');
    e.currentTarget.style.display = 'none';
  };

  const handleDownload = async () => {
    if (!currentFoto) return;
    
    try {
      const response = await fetch(currentFoto.foto_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `foto-${currentFoto.tipo_foto}-${format(new Date(currentFoto.created_at), 'dd-MM-yyyy-HH-mm')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  const handleDownloadZip = async () => {
    if (!filteredFotos.length) return;
    
    // Buscar código do lote via Supabase
    try {
      const { data: loteData } = await supabase
        .from('lotes')
        .select('codigo')
        .eq('id', loteId)
        .single();
      
      const loteCode = loteData?.codigo || loteId;
      await downloadPhotosAsZip(filteredFotos, loteCode);
    } catch (error) {
      console.error('Erro ao buscar código do lote:', error);
      await downloadPhotosAsZip(filteredFotos, loteId);
    }
  };

  const handlePhotoSelect = (index: number) => {
    setCurrentIndex(index);
    setViewMode('single');
    setImageError(null);
    setIsLoading(true);
  };

  if (!isOpen || loading) return null;
  
  if (filteredFotos.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma foto encontrada</p>
            <p className="text-xs text-muted-foreground mt-2">
              LoteId: {loteId}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] sm:max-h-[95vh] p-0 sm:max-w-4xl">
        <DialogHeader className="p-2 pb-1 sm:p-4 sm:pb-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-lg font-semibold truncate pr-2">{title}</h3>
            <div className="flex items-center gap-1 sm:gap-2">
              {viewMode === 'single' && (
                <Badge variant="secondary" className="text-xs">
                  {currentIndex + 1} de {filteredFotos.length}
                </Badge>
              )}
              {viewMode === 'single' && (
                <Button variant="outline" size="sm" onClick={handleDownload} className="px-2 sm:px-3">
                  <Download className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadZip}
                disabled={zipLoading}
                className="px-2 sm:px-3"
              >
                <Archive className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">{zipLoading ? 'Gerando...' : 'ZIP'}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
                className="px-2 sm:px-3"
              >
                {viewMode === 'grid' ? <Eye className="h-3 w-3" /> : <Grid className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1">
          {viewMode === 'grid' ? (
            /* Vista em grade - Mobile First */
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredFotos.map((foto, index) => (
                  <div
                    key={foto.id}
                    className="relative group cursor-pointer bg-muted rounded-lg overflow-hidden aspect-square"
                    onClick={() => handlePhotoSelect(index)}
                  >
                    <img
                      src={foto.foto_url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        console.warn(`Erro ao carregar foto ${index}:`, foto.foto_url);
                        e.currentTarget.style.opacity = '0.5';
                      }}
                    />
                    
                    {/* Overlay com informações */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                        <div className="text-xs font-medium mb-1 truncate">
                          {TIPO_FOTO_LABELS[foto.tipo_foto as keyof typeof TIPO_FOTO_LABELS] || foto.tipo_foto}
                        </div>
                        {!isLoteProng && (foto as any).entregas?.voluntarios && (
                          <div className="text-xs opacity-90 truncate">
                            Balde #{(foto as any).entregas.voluntarios.numero_balde} - {(foto as any).entregas.peso ? `${(foto as any).entregas.peso.toFixed(1)}kg` : 'Peso não informado'}
                          </div>
                        )}
                        {isLoteProng && (foto as any).entrega_data && (
                          <div className="text-xs opacity-90 truncate">
                            Balde #{(foto as any).entrega_data.voluntario.numero_balde} - {(foto as any).entrega_data.peso.toFixed(1)}kg
                          </div>
                        )}
                        {!isLoteProng && (foto as any).manejo_semanal && (
                          <div className="text-xs opacity-90 truncate">
                            Caixa {(foto as any).manejo_semanal.caixa_origem} → {(foto as any).manejo_semanal.caixa_destino || 'Final'}
                          </div>
                        )}
                        {isLoteProng && (foto as any).manejo_data && (
                          <div className="text-xs opacity-90 truncate">
                            Caixa {(foto as any).manejo_data.caixa_origem} → {(foto as any).manejo_data.caixa_destino || 'Final'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Badge de tipo de foto */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs px-2 py-1 bg-white/90 text-black">
                        {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Vista individual */
            <>
              <div className="relative min-h-[35vh] max-h-[50vh] h-[45vh] sm:min-h-[40vh] sm:max-h-[65vh] sm:h-[55vh] bg-muted flex items-center justify-center overflow-hidden">
                {imageError ? (
                  <div className="flex flex-col items-center text-center p-4">
                    <AlertCircle className="h-12 w-12 text-destructive mb-2" />
                    <p className="text-sm text-muted-foreground">{imageError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageError(null);
                        setIsLoading(true);
                      }}
                      className="mt-2"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                    <img
                      src={currentFoto.foto_url}
                      alt={`Foto ${TIPO_FOTO_LABELS[currentFoto.tipo_foto as keyof typeof TIPO_FOTO_LABELS]}`}
                      className="max-h-full max-w-full object-contain w-full h-full"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      style={{ display: imageError ? 'none' : 'block' }}
                    />
                  </>
                )}

                {/* Controles de navegação */}
                {filteredFotos.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={prevFoto}
                      disabled={currentIndex === 0}
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white w-10 h-10 sm:w-12 sm:h-12 z-10"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={nextFoto}
                      disabled={currentIndex === filteredFotos.length - 1}
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white w-10 h-10 sm:w-12 sm:h-12 z-10"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Informações da foto */}
              <div className="p-2 sm:p-4 border-t bg-background">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Camera className="h-2 w-2 sm:h-3 sm:w-3" />
                      <span className="truncate max-w-[120px] sm:max-w-none">
                        {TIPO_FOTO_LABELS[currentFoto.tipo_foto as keyof typeof TIPO_FOTO_LABELS] || currentFoto.tipo_foto}
                      </span>
                    </Badge>
                    {/* Exibir dados baseado no tipo de foto */}
                    {isLoteProng && 'entrega_data' in currentFoto && currentFoto.entrega_data && (
                      <p className="text-xs text-muted-foreground truncate">
                        Entrega: {currentFoto.entrega_data.peso.toFixed(1)}kg - {currentFoto.entrega_data.voluntario.nome}
                      </p>
                    )}
                    {isLoteProng && 'manejo_data' in currentFoto && currentFoto.manejo_data && (
                      <p className="text-xs text-muted-foreground truncate">
                        Manejo: Caixa {currentFoto.manejo_data.caixa_origem} → {currentFoto.manejo_data.caixa_destino || 'Final'}
                      </p>
                    )}
                    {!isLoteProng && (currentFoto as any).entregas?.voluntarios && (
                      <p className="text-xs text-muted-foreground truncate">
                        Balde #{(currentFoto as any).entregas.voluntarios.numero_balde} - {(currentFoto as any).entregas.peso ? `${(currentFoto as any).entregas.peso.toFixed(1)}kg` : 'Peso não informado'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-2 w-2 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">
                        {format(new Date(currentFoto.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                      <span className="sm:hidden">
                        {format(new Date(currentFoto.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Miniaturas */}
              {filteredFotos.length > 1 && (
                <div className="p-2 sm:p-4 border-t bg-background">
                  <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
                    {filteredFotos.map((foto, index) => (
                      <button
                        key={foto.id}
                        onClick={() => {
                          setCurrentIndex(index);
                          setImageError(null);
                          setIsLoading(true);
                        }}
                        className={`flex-shrink-0 relative border-2 rounded overflow-hidden transition-all ${
                          index === currentIndex 
                            ? 'border-primary' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={foto.foto_url}
                          alt={`Miniatura ${index + 1}`}
                          className="w-10 h-10 sm:w-16 sm:h-16 object-cover"
                          onError={(e) => {
                            console.warn(`Erro ao carregar miniatura ${index}:`, foto.foto_url);
                            e.currentTarget.style.opacity = '0.5';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};