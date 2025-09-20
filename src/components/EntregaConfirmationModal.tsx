import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, 
  Package, 
  Scale, 
  Star, 
  Camera, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { formatPesoDisplay } from '@/lib/organizationUtils';

interface EntregaConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  entregaData: {
    voluntarioNome: string;
    numeroBalde: number;
    peso: number;
    qualidadeResiduo: number;
    fotos: Array<{ tipo: string; preview: string }>;
  };
  isLoading?: boolean;
}

export const EntregaConfirmationModal: React.FC<EntregaConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  entregaData,
  isLoading = false,
}) => {
  const getQualityStars = (rating: number) => {
    return Array.from({ length: 3 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={
          index < rating
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground"
        }
      />
    ));
  };

  const getFotoTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      conteudo: 'Conteúdo',
      pesagem: 'Pesagem',
      destino: 'Destino',
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onCancel()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Confirmar Entrega
          </DialogTitle>
          <DialogDescription>
            Revise os dados antes de finalizar o registro da entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dados do Voluntário */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{entregaData.voluntarioNome}</p>
                  <p className="text-sm text-muted-foreground">
                    Balde nº {entregaData.numeroBalde}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Peso</p>
                    <Badge variant="secondary" className="font-bold">
                      {formatPesoDisplay(entregaData.peso)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Qualidade</p>
                    <div className="flex gap-1">
                      {getQualityStars(entregaData.qualidadeResiduo)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fotos Capturadas */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">Fotos Capturadas</p>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {entregaData.fotos.map((foto, index) => (
                  <div key={index} className="space-y-1">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={foto.preview}
                        alt={`Foto ${getFotoTipoLabel(foto.tipo)}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {getFotoTipoLabel(foto.tipo)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aviso importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>⚠️ Importante:</strong> Após confirmar, os dados não poderão ser alterados. 
              Verifique se todas as informações estão corretas.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar e Refazer
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Finalizando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};