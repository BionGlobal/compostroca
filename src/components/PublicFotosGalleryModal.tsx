import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

interface PublicFoto {
  id: string;
  foto_url: string;
  tipo_foto: string;
  created_at: string;
}

interface PublicFotosGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fotos: PublicFoto[];
  title: string;
}

export const PublicFotosGalleryModal: React.FC<PublicFotosGalleryModalProps> = ({
  isOpen,
  onClose,
  fotos,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!fotos || fotos.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma foto encontrada</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentFoto = fotos[currentIndex];

  const nextFoto = () => {
    setCurrentIndex((prev) => (prev + 1) % fotos.length);
  };

  const prevFoto = () => {
    setCurrentIndex((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title} ({fotos.length} fotos)
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={currentFoto.foto_url}
              alt={currentFoto.tipo_foto}
              className="w-full h-full object-contain"
            />
            
            {fotos.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2"
                  onClick={prevFoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={nextFoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <Badge variant="secondary">{currentFoto.tipo_foto}</Badge>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} de {fotos.length}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};