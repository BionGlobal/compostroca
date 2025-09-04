import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Calendar, Camera, AlertCircle, FileImage, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLoteFotos, LoteFoto } from '@/hooks/useLoteFotos';

interface FotosGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  title: string;
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
  entregaId,
  manejoId
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { fotos, loading } = useLoteFotos(loteId);
  
  // Filtrar fotos baseado nos parâmetros
  const filteredFotos = fotos.filter(foto => {
    if (entregaId) return foto.entrega_id === entregaId;
    if (manejoId) return foto.manejo_id === manejoId;
    return true;
  });

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

  if (!isOpen || loading) return null;
  
  if (filteredFotos.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="absolute right-2 top-2">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma foto encontrada</p>
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
              <Badge variant="secondary">
                {currentIndex + 1} de {filteredFotos.length}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-3 w-3 mr-1" />
                Baixar
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1">
          {/* Área principal da imagem */}
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
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={nextFoto}
                  disabled={currentIndex === filteredFotos.length - 1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Informações da foto */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {TIPO_FOTO_LABELS[currentFoto.tipo_foto as keyof typeof TIPO_FOTO_LABELS] || currentFoto.tipo_foto}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
};