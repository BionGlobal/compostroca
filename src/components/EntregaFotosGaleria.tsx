import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';

interface EntregaFotosGaleriaProps {
  entregaId: string;
  numeroBalde: number;
  children: React.ReactNode;
}

export const EntregaFotosGaleria: React.FC<EntregaFotosGaleriaProps> = ({ 
  entregaId, 
  numeroBalde, 
  children 
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const { fotos, loading, getFotoUrl } = useEntregaFotos(entregaId);

  const photoTypes = ['conteudo', 'pesagem', 'destino'] as const;
  const photoLabels = {
    conteudo: `Foto 1: Conteúdo do balde nº${numeroBalde}`,
    pesagem: `Foto 2: Pesagem do balde nº${numeroBalde}`,
    destino: `Foto 3: Destino do balde nº${numeroBalde}`
  };

  const organizedPhotos = photoTypes.map(type => {
    const foto = fotos.find(f => f.tipo_foto === type);
    return {
      type,
      label: photoLabels[type],
      url: foto ? getFotoUrl(foto.foto_url) : null,
      exists: !!foto
    };
  });

  const availablePhotos = organizedPhotos.filter(p => p.exists);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === availablePhotos.length - 1 ? 0 : prev + 1
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? availablePhotos.length - 1 : prev - 1
    );
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Eye className="h-4 w-4 mr-1" />
        Carregando...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Fotos da Entrega - Balde nº{numeroBalde}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {availablePhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nenhuma foto encontrada para esta entrega
              </p>
            </div>
          ) : (
            <>
              {/* Navegação por tipos de foto */}
              <div className="flex gap-2 justify-center flex-wrap">
                {organizedPhotos.map((photo, index) => (
                  <Button
                    key={photo.type}
                    variant={photo.exists ? "outline" : "ghost"}
                    size="sm"
                    disabled={!photo.exists}
                    onClick={() => {
                      if (photo.exists) {
                        const photoIndex = availablePhotos.findIndex(p => p.type === photo.type);
                        setCurrentPhotoIndex(photoIndex);
                      }
                    }}
                    className="text-xs"
                  >
                    {index + 1}. {photo.type}
                    {!photo.exists && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Sem foto
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Visualizador de foto */}
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {availablePhotos[currentPhotoIndex]?.url ? (
                    <img
                      src={availablePhotos[currentPhotoIndex].url}
                      alt={availablePhotos[currentPhotoIndex].label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Skeleton className="w-full h-full" />
                    </div>
                  )}
                </div>

                {/* Controles de navegação */}
                {availablePhotos.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={prevPhoto}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={nextPhoto}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Indicador de posição */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <Badge variant="secondary" className="text-xs">
                    {currentPhotoIndex + 1} de {availablePhotos.length}
                  </Badge>
                </div>
              </div>

              {/* Legenda da foto atual */}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {availablePhotos[currentPhotoIndex]?.label}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};