import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Camera, Users } from "lucide-react";

interface FotoData {
  id: string;
  foto_url: string;
  tipo_foto: 'entrega' | 'manejo_semanal';
  created_at: string;
  entrega_data?: {
    peso: number;
    qualidade_residuo: number;
    voluntario_nome: string;
    observacoes?: string;
  };
  manejo_data?: {
    caixa_origem: number;
    caixa_destino?: number;
    peso_antes: number;
    peso_depois: number;
    observacoes?: string;
  };
}

interface FotosLoteProntoModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  loteCodigo: string;
  fotos: FotoData[];
}

export const FotosLoteProntoModal = ({ 
  isOpen, 
  onClose, 
  loteId, 
  loteCodigo, 
  fotos 
}: FotosLoteProntoModalProps) => {
  const [selectedTab, setSelectedTab] = useState<string>("todas");

  const fotosEntregas = fotos.filter(f => f.tipo_foto === 'entrega');
  const fotosManejo = fotos.filter(f => f.tipo_foto === 'manejo_semanal');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao fazer download da imagem:', error);
    }
  };

  const renderFotoCard = (foto: FotoData) => (
    <div key={foto.id} className="bg-card rounded-lg border p-4 space-y-3">
      <div className="relative group">
        <img 
          src={foto.foto_url} 
          alt={`Foto ${foto.tipo_foto}`}
          className="w-full h-48 object-cover rounded-md"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadImage(
              foto.foto_url, 
              `${loteCodigo}_${foto.tipo_foto}_${foto.id}.jpg`
            )}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={foto.tipo_foto === 'entrega' ? 'default' : 'secondary'}>
            {foto.tipo_foto === 'entrega' ? (
              <>
                <Users className="h-3 w-3 mr-1" />
                Entrega
              </>
            ) : (
              <>
                <Camera className="h-3 w-3 mr-1" />
                Manejo
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(foto.created_at)}
          </span>
        </div>

        {foto.tipo_foto === 'entrega' && foto.entrega_data && (
          <div className="text-sm space-y-1">
            <p><strong>Voluntário:</strong> {foto.entrega_data.voluntario_nome}</p>
            <p><strong>Peso:</strong> {foto.entrega_data.peso}kg</p>
            <p><strong>Qualidade:</strong> {foto.entrega_data.qualidade_residuo}/5</p>
            {foto.entrega_data.observacoes && (
              <p><strong>Obs:</strong> {foto.entrega_data.observacoes}</p>
            )}
          </div>
        )}

        {foto.tipo_foto === 'manejo_semanal' && foto.manejo_data && (
          <div className="text-sm space-y-1">
            <p><strong>Caixa:</strong> {foto.manejo_data.caixa_origem} 
              {foto.manejo_data.caixa_destino && ` → ${foto.manejo_data.caixa_destino}`}
            </p>
            <p><strong>Peso:</strong> {foto.manejo_data.peso_antes}kg → {foto.manejo_data.peso_depois}kg</p>
            {foto.manejo_data.observacoes && (
              <p><strong>Obs:</strong> {foto.manejo_data.observacoes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos do Lote {loteCodigo}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todas">
              Todas ({fotos.length})
            </TabsTrigger>
            <TabsTrigger value="entregas">
              Entregas ({fotosEntregas.length})
            </TabsTrigger>
            <TabsTrigger value="manejo">
              Manejo ({fotosManejo.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <TabsContent value="todas" className="space-y-4">
              {fotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fotos.map(renderFotoCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma foto encontrada para este lote
                </div>
              )}
            </TabsContent>

            <TabsContent value="entregas" className="space-y-4">
              {fotosEntregas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fotosEntregas.map(renderFotoCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma foto de entrega encontrada
                </div>
              )}
            </TabsContent>

            <TabsContent value="manejo" className="space-y-4">
              {fotosManejo.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fotosManejo.map(renderFotoCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma foto de manejo encontrada
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};