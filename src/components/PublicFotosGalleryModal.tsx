import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Camera, AlertCircle, FileImage, Download, Archive, Grid, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLoteFotos } from '@/hooks/useLoteFotos';
import { useZipDownload } from '@/hooks/useZipDownload';
import { supabase } from '@/integrations/supabase/client';

interface PublicFotosGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  title: string;
}

const TIPO_FOTO_LABELS = {
  'entrega_conteudo': 'Conteúdo da Entrega',
  'entrega_pesagem': 'Pesagem',
  'entrega_destino': 'Destino',
  'manejo_semanal': 'Manejo Semanal'
} as const;

export const PublicFotosGalleryModal: React.FC<PublicFotosGalleryModalProps> = ({
  isOpen,
  onClose,
  loteId,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');

  const { fotos, loading, getFotoUrl } = useLoteFotos(loteId);
  const { downloadPhotosAsZip, loading: zipLoading } = useZipDownload();

  // Mapear fotos com URLs públicas
  const filteredFotos = fotos.map((foto) => ({
    ...foto,
    foto_url: getFotoUrl(foto.foto_url)
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center gap-2">
              {viewMode === 'single' && (
                <Badge variant="secondary">
                  {currentIndex + 1} de {filteredFotos.length}
                </Badge>
              )}
              {viewMode === 'single' && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Baixar
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadZip}
                disabled={zipLoading}
              >
                <Archive className="h-3 w-3 mr-1" />
                {zipLoading ? 'Gerando...' : 'Baixar ZIP'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
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
                        {(foto as any).entregas?.voluntarios && (
                          <div className="text-xs opacity-90 truncate">
                            Balde #{(foto as any).entregas.voluntarios.numero_balde} - {(foto as any).entregas.peso ? `${(foto as any).entregas.peso.toFixed(1)}kg` : 'Peso não informado'}
                          </div>
                        )}
                        {(foto as any).manejo_semanal && (
                          <div className="text-xs opacity-90 truncate">
                            Caixa {(foto as any).manejo_semanal.caixa_origem} → {(foto as any).manejo_semanal.caixa_destino || 'Final'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Badge de índice */}
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
              <div className="relative h-[60vh] bg-muted flex items-center justify-center">
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
                      className="max-h-full max-w-full object-contain"
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
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white w-12 h-12"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={nextFoto}
                      disabled={currentIndex === filteredFotos.length - 1}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white w-12 h-12"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Informações da foto */}
              <div className="p-4 border-t bg-background">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {TIPO_FOTO_LABELS[currentFoto.tipo_foto as keyof typeof TIPO_FOTO_LABELS] || currentFoto.tipo_foto}
                    </Badge>
                    {(currentFoto as any).entregas?.voluntarios && (
                      <p className="text-xs text-muted-foreground">
                        Balde #{(currentFoto as any).entregas.voluntarios.numero_balde} - {(currentFoto as any).entregas.peso ? `${(currentFoto as any).entregas.peso.toFixed(1)}kg` : 'Peso não informado'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {format(new Date(currentFoto.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Miniaturas */}
              {filteredFotos.length > 1 && (
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2 overflow-x-auto pb-2">
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
                          className="w-16 h-16 object-cover"
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

        {/* Footer com assinatura Bion */}
        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">Bion</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};