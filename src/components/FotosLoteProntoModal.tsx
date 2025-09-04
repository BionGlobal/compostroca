import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Calendar, Camera, AlertCircle, FileImage, Download, Archive, Grid, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLoteProntoFotos, LoteProntoFoto } from '@/hooks/useLoteProntoFotos';
import { useZipDownload } from '@/hooks/useZipDownload';
import { supabase } from '@/integrations/supabase/client';

interface FotosLoteProntoModalProps {
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

export const FotosLoteProntoModal: React.FC<FotosLoteProntoModalProps> = ({
  isOpen,
  onClose,
  loteId,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  
  const { fotos, loading, getFotoUrl, getFotosEntregas, getFotosManejo } = useLoteProntoFotos(loteId);
  const { downloadPhotosAsZip, loading: zipLoading } = useZipDownload();

  const fotosEntregas = getFotosEntregas();
  const fotosManejo = getFotosManejo();

  const nextFoto = () => {
    if (currentIndex < fotos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageError(null);
      setImageLoading(true);
    }
  };

  const prevFoto = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageError(null);
      setImageLoading(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(null);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError('Não foi possível carregar a imagem');
  };

  const handleDownload = async (foto: any) => {
    try {
      const response = await fetch(getFotoUrl(foto.foto_url));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `foto-${foto.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar foto:', error);
    }
  };

  const handleDownloadZip = async () => {
    if (fotos.length === 0) return;
    
    try {
      // Buscar código do lote
      const { data: lote } = await supabase
        .from('lotes')
        .select('codigo')
        .eq('id', loteId)
        .single();
      
      const loteCode = lote?.codigo || 'lote-desconhecido';
      
      const fotosForZip = fotos.map(foto => ({
        foto_url: getFotoUrl(foto.foto_url),
        tipo_foto: foto.tipo_foto,
        created_at: foto.created_at
      }));
      
      await downloadPhotosAsZip(fotosForZip, loteCode);
    } catch (error) {
      console.error('Erro ao preparar ZIP:', error);
    }
  };

  if (!isOpen) return null;

  const currentFoto = fotos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 bg-black/95 border-none">
        <DialogHeader className="px-6 py-4 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-lg font-semibold">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
                className="text-white hover:bg-white/20"
              >
                {viewMode === 'single' ? <Grid className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              {fotos.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={zipLoading}
                  className="text-white hover:bg-white/20"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {zipLoading ? 'Gerando...' : 'ZIP'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-6">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Carregando fotos...</p>
              </div>
            </div>
          ) : fotos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white text-center">
                <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nenhuma foto encontrada</p>
                <p className="text-sm opacity-70">
                  Não há fotos das entregas iniciais nem da última manutenção para este lote.
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="flex-1 overflow-auto">
              <div className="mb-6">
                <h3 className="text-white text-lg font-semibold mb-4">
                  📦 Fotos das Entregas Iniciais ({fotosEntregas.length})
                </h3>
                {fotosEntregas.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fotosEntregas.map((foto, index) => (
                      <div key={foto.id} className="bg-white/10 rounded-lg overflow-hidden">
                        <img
                          src={getFotoUrl(foto.foto_url)}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setCurrentIndex(fotos.findIndex(f => f.id === foto.id));
                            setViewMode('single');
                          }}
                        />
                        <div className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {TIPO_FOTO_LABELS[foto.tipo_foto] || foto.tipo_foto}
                          </Badge>
                          {foto.entregas && (
                            <p className="text-white text-xs mt-1">
                              {foto.entregas.voluntarios.nome} - {foto.entregas.peso}kg
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/70 text-sm">Nenhuma foto de entrega encontrada</p>
                )}
              </div>

              <div>
                <h3 className="text-white text-lg font-semibold mb-4">
                  🔧 Fotos da Última Manutenção (Caixa 7) ({fotosManejo.length})
                </h3>
                {fotosManejo.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fotosManejo.map((foto, index) => (
                      <div key={foto.id} className="bg-white/10 rounded-lg overflow-hidden">
                        <img
                          src={getFotoUrl(foto.foto_url)}
                          alt={`Foto manejo ${index + 1}`}
                          className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setCurrentIndex(fotos.findIndex(f => f.id === foto.id));
                            setViewMode('single');
                          }}
                        />
                        <div className="p-2">
                          <Badge variant="outline" className="text-xs text-white border-white/30">
                            Manejo Semanal
                          </Badge>
                          {foto.manejo_semanal && (
                            <p className="text-white text-xs mt-1">
                              {foto.manejo_semanal.peso_antes}kg → {foto.manejo_semanal.peso_depois}kg
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/70 text-sm">Nenhuma foto de manutenção encontrada</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex">
              {/* Área da imagem */}
              <div className="flex-1 flex items-center justify-center relative">
                {imageError ? (
                  <div className="text-center text-white">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{imageError}</p>
                  </div>
                ) : (
                  <div className="relative max-w-full max-h-full">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                      </div>
                    )}
                    <img
                      src={getFotoUrl(currentFoto.foto_url)}
                      alt={`Foto ${currentIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  </div>
                )}

                {/* Navegação */}
                {fotos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={prevFoto}
                      disabled={currentIndex === 0}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={nextFoto}
                      disabled={currentIndex === fotos.length - 1}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                  </>
                )}
              </div>

              {/* Painel lateral com informações */}
              {currentFoto && (
                <div className="w-80 bg-black/50 backdrop-blur-sm p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <Badge variant="secondary">
                        {TIPO_FOTO_LABELS[currentFoto.tipo_foto] || currentFoto.tipo_foto}
                      </Badge>
                    </div>

                    <div className="text-white space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {format(new Date(currentFoto.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {currentFoto.entregas && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <h4 className="text-white font-medium mb-2">Dados da Entrega</h4>
                        <div className="text-white text-sm space-y-1">
                          <p>Voluntário: {currentFoto.entregas.voluntarios.nome}</p>
                          <p>Balde: #{currentFoto.entregas.voluntarios.numero_balde}</p>
                          <p>Peso: {currentFoto.entregas.peso} kg</p>
                          <p>Qualidade: {currentFoto.entregas.qualidade_residuo}/3</p>
                        </div>
                      </div>
                    )}

                    {currentFoto.manejo_semanal && (
                      <div className="bg-white/10 rounded-lg p-3">
                        <h4 className="text-white font-medium mb-2">Dados do Manejo</h4>
                        <div className="text-white text-sm space-y-1">
                          <p>Caixa: {currentFoto.manejo_semanal.caixa_origem} → {currentFoto.manejo_semanal.caixa_destino}</p>
                          <p>Peso antes: {currentFoto.manejo_semanal.peso_antes} kg</p>
                          <p>Peso depois: {currentFoto.manejo_semanal.peso_depois} kg</p>
                          {currentFoto.manejo_semanal.observacoes && (
                            <p>Obs: {currentFoto.manejo_semanal.observacoes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(currentFoto)}
                      className="w-full text-white border-white/30 hover:bg-white/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Foto
                    </Button>

                    <div className="text-center text-white/70 text-sm">
                      {currentIndex + 1} de {fotos.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};