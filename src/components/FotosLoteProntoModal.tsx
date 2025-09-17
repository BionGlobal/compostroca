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
  'entrega_conteudo': 'Entrega - Conteúdo',
  'entrega_pesagem': 'Entrega - Pesagem', 
  'entrega_destino': 'Entrega - Destino',
  'manejo_semanal': 'Manutenção Final',
  'entrega': 'Entregas (Início)'
};

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
  
  const { fotos, loading, getFotoUrl, getFotosByTipo, getFotosEntregas, getFotosManejo } = useLoteProntoFotos(loteId);
  const { downloadPhotosAsZip, loading: zipLoading } = useZipDownload();

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
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} encontrada{fotos.length === 1 ? '' : 's'}</p>
                <div className="flex gap-4 text-xs">
                  <span>Entregas: {getFotosByTipo('entrega').length}</span>
                  <span>Manutenção: {getFotosByTipo('manejo_semanal').length}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
              >
                {viewMode === 'single' ? <Grid className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              {fotos.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={zipLoading}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {zipLoading ? 'Gerando...' : 'ZIP'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-96">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Carregando fotos...</p>
              </div>
            </div>
          ) : fotos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-96">
              <div className="text-center">
                <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nenhuma foto encontrada</p>
                <p className="text-sm opacity-70">
                  Histórico de fotos não disponível para este lote.
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-8">
                {/* Fotos das Entregas */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    📦 Entregas Iniciais ({getFotosEntregas().length})
                  </h3>
                  {getFotosEntregas().length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {getFotosEntregas().map((foto, index) => (
                        <div key={foto.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <img
                            src={getFotoUrl(foto.foto_url)}
                            alt={`Entrega ${index + 1}`}
                            className="w-full h-32 object-cover cursor-pointer"
                            onClick={() => {
                              setCurrentIndex(fotos.findIndex(f => f.id === foto.id));
                              setViewMode('single');
                            }}
                          />
                          <div className="p-3">
                            <Badge variant="outline" className="text-xs mb-2">
                              {TIPO_FOTO_LABELS[foto.tipo_foto] || foto.tipo_foto}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {format(new Date(foto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {foto.entrega_data && (
                              <div className="text-xs text-gray-600 mt-1">
                                <div>Voluntário: {foto.entrega_data.voluntario.nome}</div>
                                <div>Peso: {foto.entrega_data.peso}kg | Balde: {foto.entrega_data.voluntario.numero_balde}</div>
                                {foto.entrega_data.observacoes && (
                                  <div className="mt-1 italic">"{foto.entrega_data.observacoes}"</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma foto de entrega encontrada</p>
                  )}
                </div>

                {/* Fotos da Manutenção */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    🔧 Manutenção Final ({getFotosManejo().length})
                  </h3>
                  {getFotosManejo().length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {getFotosManejo().map((foto, index) => (
                        <div key={foto.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <img
                            src={getFotoUrl(foto.foto_url)}
                            alt={`Manejo ${index + 1}`}
                            className="w-full h-32 object-cover cursor-pointer"
                            onClick={() => {
                              setCurrentIndex(fotos.findIndex(f => f.id === foto.id));
                              setViewMode('single');
                            }}
                          />
                          <div className="p-3">
                            <Badge variant="outline" className="text-xs mb-2">
                              Manutenção Final
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {format(new Date(foto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {foto.manejo_data && (
                              <div className="text-xs text-gray-600 mt-1">
                                <div>Caixa {foto.manejo_data.caixa_origem} → {foto.manejo_data.caixa_destino || 'Final'}</div>
                                <div>Peso: {foto.manejo_data.peso_antes}kg → {foto.manejo_data.peso_depois}kg</div>
                                {foto.manejo_data.observacoes && (
                                  <div className="mt-1 italic">"{foto.manejo_data.observacoes}"</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma foto de manutenção encontrada</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(90vh-120px)]">
              {/* Área da imagem */}
              <div className="flex-1 flex items-center justify-center relative bg-black">
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
                <div className="w-80 bg-gray-50 border-l p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="text-sm font-medium mb-2">
                      {TIPO_FOTO_LABELS[currentFoto.tipo_foto] || currentFoto.tipo_foto}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      {format(new Date(currentFoto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    {currentFoto.entrega_data && (
                      <div className="text-xs text-gray-600 space-y-2 bg-blue-50 p-3 rounded">
                        <div><strong>Voluntário:</strong> {currentFoto.entrega_data.voluntario.nome}</div>
                        <div><strong>Peso entregue:</strong> {currentFoto.entrega_data.peso}kg</div>
                        <div><strong>Balde nº:</strong> {currentFoto.entrega_data.voluntario.numero_balde}</div>
                        {currentFoto.entrega_data.qualidade_residuo && (
                          <div><strong>Qualidade:</strong> {currentFoto.entrega_data.qualidade_residuo}/5 ⭐</div>
                        )}
                        {currentFoto.entrega_data.observacoes && (
                          <div className="mt-2 p-2 bg-white rounded border-l-2 border-blue-300">
                            <strong>Observações:</strong> {currentFoto.entrega_data.observacoes}
                          </div>
                        )}
                      </div>
                    )}
                    {currentFoto.manejo_data && (
                      <div className="text-xs text-gray-600 space-y-2 bg-green-50 p-3 rounded">
                        <div><strong>Transferência:</strong> Caixa {currentFoto.manejo_data.caixa_origem} → {currentFoto.manejo_data.caixa_destino || 'Final'}</div>
                        <div><strong>Redução de peso:</strong> {currentFoto.manejo_data.peso_antes}kg → {currentFoto.manejo_data.peso_depois}kg</div>
                        <div><strong>Perda:</strong> {(currentFoto.manejo_data.peso_antes - currentFoto.manejo_data.peso_depois).toFixed(2)}kg ({(((currentFoto.manejo_data.peso_antes - currentFoto.manejo_data.peso_depois) / currentFoto.manejo_data.peso_antes) * 100).toFixed(1)}%)</div>
                        {currentFoto.manejo_data.latitude && currentFoto.manejo_data.longitude && (
                          <div><strong>Local:</strong> {currentFoto.manejo_data.latitude.toFixed(6)}, {currentFoto.manejo_data.longitude.toFixed(6)}</div>
                        )}
                        {currentFoto.manejo_data.observacoes && (
                          <div className="mt-2 p-2 bg-white rounded border-l-2 border-green-300">
                            <strong>Observações:</strong> {currentFoto.manejo_data.observacoes}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(currentFoto)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Foto
                    </Button>

                    <div className="text-center text-gray-500 text-sm">
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