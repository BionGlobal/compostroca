import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Upload, 
  X, 
  Camera, 
  CheckCheck, 
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ManejoSimplificadoProps {
  open: boolean;
  onClose: () => void;
  lotes: any[];
  organizacao: string;
  onManejoCompleto: () => void;
}

interface FotoUpload {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: string;
  uploadProgress?: number;
}

export const ManejoSimplificado: React.FC<ManejoSimplificadoProps> = ({
  open,
  onClose,
  lotes,
  organizacao,
  onManejoCompleto
}) => {
  const [fotos, setFotos] = useState<FotoUpload[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [localizacao, setLocalizacao] = useState<{lat: number, lng: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const lotesAtivos = lotes.filter(l => l.status === 'ativo' || l.status === 'em_processamento');

  React.useEffect(() => {
    if (open) {
      // Resetar estado ao abrir
      setFotos([]);
      setObservacoes('');
      setLocalizacao(null);
      
      // Obter localização
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocalizacao({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Erro ao obter localização:', error);
          }
        );
      }
    }
  }, [open]);

  // Função para comprimir imagem
  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        try {
          // Definir tamanho máximo
          const maxWidth = 1024;
          const maxHeight = 1024;
          let { width, height } = img;
          
          // Calcular novo tamanho mantendo proporção
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.85 // Qualidade 85%
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limitar a 10 fotos
    if (fotos.length + files.length > 10) {
      toast({
        title: "Limite de fotos",
        description: "Você pode adicionar no máximo 10 fotos",
        variant: "destructive"
      });
      return;
    }

    const novasFotos: FotoUpload[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Comprimir imagem
        const compressedFile = await compressImage(file);
        
        const preview = URL.createObjectURL(compressedFile);
        novasFotos.push({
          file: compressedFile,
          preview,
          uploading: false
        });
      } catch (error) {
        console.error('Erro ao processar foto:', error);
        toast({
          title: "Erro ao processar foto",
          description: `Falha ao processar ${file.name}`,
          variant: "destructive"
        });
      }
    }

    setFotos(prev => [...prev, ...novasFotos]);

    // Resetar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Iniciar upload automático
    uploadFotosAutomaticamente(novasFotos);
  }, [fotos, toast, compressImage]);

  const uploadFotosAutomaticamente = async (novasFotos: FotoUpload[]) => {
    for (let i = 0; i < novasFotos.length; i++) {
      const foto = novasFotos[i];
      const index = fotos.length + i;
      
      try {
        // Marcar como enviando
        setFotos(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], uploading: true };
          return updated;
        });

        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `manejo/${organizacao}/${filename}`;

        const { error: uploadError, data } = await supabase.storage
          .from('manejo-fotos')
          .upload(filePath, foto.file, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('manejo-fotos')
          .getPublicUrl(filePath);

        // Atualizar com URL
        setFotos(prev => {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index], 
            uploading: false, 
            url: publicUrl 
          };
          return updated;
        });

      } catch (error) {
        console.error('Erro no upload:', error);
        setFotos(prev => {
          const updated = [...prev];
          updated[index] = { 
            ...updated[index], 
            uploading: false, 
            error: error instanceof Error ? error.message : 'Erro no upload'
          };
          return updated;
        });
      }
    }
  };

  const removerFoto = useCallback((index: number) => {
    setFotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const uploadFotos = async (): Promise<string[]> => {
    const fotosComUrl = fotos.filter(f => f.url && !f.error);
    return fotosComUrl.map(f => f.url!);
  };

  const retryUpload = async (index: number) => {
    const foto = fotos[index];
    if (!foto || foto.uploading) return;

    try {
      setFotos(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], uploading: true, error: undefined };
        return updated;
      });

      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `manejo/${organizacao}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('manejo-fotos')
        .upload(filePath, foto.file, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('manejo-fotos')
        .getPublicUrl(filePath);

      setFotos(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          uploading: false, 
          url: publicUrl,
          error: undefined
        };
        return updated;
      });

      toast({
        title: "Upload concluído",
        description: `Foto ${index + 1} enviada com sucesso`,
      });

    } catch (error) {
      console.error('Erro no retry:', error);
      setFotos(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          uploading: false, 
          error: error instanceof Error ? error.message : 'Erro no upload'
        };
        return updated;
      });

      toast({
        title: "Falha no retry",
        description: `Não foi possível reenviar a foto ${index + 1}`,
        variant: "destructive"
      });
    }
  };

  const handleConfirmar = async () => {
    if (fotos.length === 0) {
      toast({
        title: "Foto obrigatória",
        description: "Adicione pelo menos 1 foto para documentar o manejo",
        variant: "destructive"
      });
      return;
    }

    // Verificar se há fotos com erro
    const fotosComErro = fotos.filter(f => f.error);
    if (fotosComErro.length > 0) {
      toast({
        title: "Fotos com erro",
        description: `${fotosComErro.length} foto(s) falharam no upload. Corrija ou remova-as antes de continuar.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Iniciando processo de manejo semanal...');
      
      // 1. Upload das fotos
      const fotoUrls = await uploadFotos();
      console.log(`✅ ${fotoUrls.length} fotos enviadas com sucesso`);
      
      // 2. Chamar Edge Function para processar esteira automaticamente
      console.log('🔄 Chamando Edge Function para movimentar esteira...');
      
      const { data, error } = await supabase.functions.invoke('finalizar-manutencao-semanal', {
        body: {
          unidade_codigo: organizacao,
          data_sessao: new Date().toISOString(),
          administrador_id: user?.id,
          administrador_nome: user?.user_metadata?.full_name || user?.email || 'Sistema',
          observacoes_gerais: observacoes || 'Manutenção semanal',
          fotos_gerais: fotoUrls,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng
        }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        throw new Error(error.message || 'Falha ao processar esteira');
      }

      console.log('✅ Edge Function executada com sucesso:', data);
      console.log(`📊 Lotes processados: ${data.total_lotes_processados}`);

      toast({
        title: "Manejo concluído!",
        description: `${data.total_lotes_processados} lotes processados. Esteira avançou com sucesso!`,
      });

      onManejoCompleto();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao processar manejo:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível processar o manejo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleObservacoesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObservacoes(e.target.value);
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Camera className="h-6 w-6" />
            Registro de Manejo
          </DialogTitle>
          <p className="text-muted-foreground">
            Documente o processo de aeração, transferências de lotes e distribuição do composto pronto.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload de Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Fotos
                <Badge variant="outline">{fotos.length}/10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label
                  htmlFor="file-upload"
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors block"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique ou arraste para adicionar fotos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG (máx. 10 fotos)
                  </p>
                </label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Preview das fotos */}
                {fotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        
                        {/* Status overlay */}
                        {foto.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="text-white text-sm">Enviando...</div>
                          </div>
                        )}
                        
                        {foto.url && !foto.error && (
                          <div className="absolute top-2 right-2">
                            <CheckCheck className="h-5 w-5 text-green-500 bg-white rounded-full p-0.5" />
                          </div>
                        )}
                        
                        {foto.error && (
                          <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center rounded-lg p-2">
                            <p className="text-red-600 text-xs text-center mb-2">{foto.error}</p>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => retryUpload(index)}
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        )}
                        
                        {/* Botão remover */}
                        <button
                          onClick={() => removerFoto(index)}
                          className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Localização */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {localizacao ? (
                  <span>
                    Localização: {localizacao.lat.toFixed(6)}, {localizacao.lng.toFixed(6)}
                  </span>
                ) : (
                  <span>Obtendo localização...</span>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={handleObservacoesChange}
                  placeholder="Adicione observações sobre o manejo (condições climáticas, odor, umidade, etc.)"
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                />
              </div>

              {/* Resumo */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Resumo da Operação</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {lotesAtivos.length} lotes serão processados</li>
                  <li>• Lotes avançarão para a próxima caixa</li>
                  <li>• Redução de peso: 3.54% por semana</li>
                  <li>• Lote na caixa 7 será finalizado</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={loading || fotos.length === 0}
            >
              {loading ? 'Processando...' : 'Confirmar Manejo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
