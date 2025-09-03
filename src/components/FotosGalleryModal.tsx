import { useState } from 'react';
import { X, Download, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FotosGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fotos: string[];
  title: string;
  loteCode: string;
}

export const FotosGalleryModal = ({ 
  open, 
  onOpenChange, 
  fotos, 
  title, 
  loteCode 
}: FotosGalleryModalProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === fotos.length - 1 ? 0 : prev + 1));
  };

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${loteCode}-foto-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < fotos.length; i++) {
      await handleDownloadImage(fotos[i], i);
      // Pequeno delay para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (fotos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Lote: {loteCode}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {fotos.length} foto{fotos.length > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Baixar Todas
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 bg-black/5">
          {/* Imagem principal */}
          <div className="relative h-[60vh] flex items-center justify-center bg-black/10">
             <img
               src={fotos[selectedIndex]}
               alt={`Foto ${selectedIndex + 1} do lote ${loteCode}`}
               className="max-h-full max-w-full object-contain rounded"
               onError={(e) => {
                 console.error(`Erro ao carregar foto principal ${selectedIndex}:`, fotos[selectedIndex]);
                 e.currentTarget.style.display = 'none';
               }}
             />
            
            {/* Controles de navegação */}
            {fotos.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Contador e ações */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-white/90 rounded-full px-4 py-2">
              {fotos.length > 1 && (
                <span className="text-sm font-medium">
                  {selectedIndex + 1} de {fotos.length}
                </span>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadImage(fotos[selectedIndex], selectedIndex)}
                className="h-8 px-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Miniatures */}
          {fotos.length > 1 && (
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`flex-shrink-0 relative border-2 rounded overflow-hidden transition-all ${
                      index === selectedIndex 
                        ? 'border-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                     <img
                       src={foto}
                       alt={`Miniatura ${index + 1}`}
                       className="w-16 h-16 object-cover"
                       onError={(e) => {
                         console.warn(`Erro ao carregar miniatura ${index}:`, foto);
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                    {index === selectedIndex && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <ZoomIn className="h-4 w-4 text-primary" />
                      </div>
                    )}
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