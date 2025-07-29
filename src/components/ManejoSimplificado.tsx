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
          
          // Desenhar e comprimir
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    if (fotos.length + files.length > 10) {
      toast({
        title: "Limite excedido",
        description: "Máximo de 10 fotos permitidas",
        variant: "destructive"
      });
      return;
    }

    try {
      // Validar tipos de arquivo
      const validFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
        return isImage && isValidSize;
      });

      if (validFiles.length !== files.length) {
        toast({
          title: "Arquivos inválidos",
          description: "Apenas imagens até 10MB são permitidas",
          variant: "destructive"
        });
      }

      // Comprimir e processar imagens válidas
      const fotosComprimidas = await Promise.all(
        validFiles.map(async (file) => {
          const compressedFile = await compressImage(file);
          return {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            uploading: false
          };
        })
      );

      setFotos(prev => [...prev, ...fotosComprimidas]);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao processar fotos:', error);
      toast({
        title: "Erro no upload",
        description: "Falha ao processar uma ou mais imagens",
        variant: "destructive",
      });
    }
  }, [fotos.length, compressImage, toast]);

  const removerFoto = useCallback((index: number) => {
    setFotos(prev => {
      const novasFotos = [...prev];
      URL.revokeObjectURL(novasFotos[index].preview);
      novasFotos.splice(index, 1);
      return novasFotos;
    });
  }, []);

  const uploadFotos = async (): Promise<string[]> => {
    if (!user) throw new Error('Usuário não autenticado');

    const urlsFotos: string[] = [];

    try {
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        
        if (foto.url) {
          urlsFotos.push(foto.url);
          continue;
        }

        // Marcar como fazendo upload
        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { ...novasFotos[i], uploading: true };
          return novasFotos;
        });

        const fileName = `${user.id}/manejo-${Date.now()}-${i}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('manejo-fotos')
          .upload(fileName, foto.file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('manejo-fotos')
          .getPublicUrl(fileName);

        urlsFotos.push(data.publicUrl);

        // Marcar como concluído
        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { ...novasFotos[i], uploading: false, url: data.publicUrl };
          return novasFotos;
        });
      }
    } catch (error) {
      console.error('Erro no upload das fotos:', error);
      throw error;
    }

    return urlsFotos;
  };

  const processarEsteira = async () => {
    if (!user) return;

    // Finalizar lote da caixa 7 (se existir)
    const lote7 = lotesAtivos.find(l => l.caixa_atual === 7);
    if (lote7) {
      await supabase
        .from('lotes')
        .update({
          status: 'encerrado',
          peso_atual: lote7.peso_atual * 0.9685, // Redução de 3.15%
          data_encerramento: new Date().toISOString()
        })
        .eq('id', lote7.id);
    }

    // Transferir lotes: 6→7, 5→6, 4→5, 3→4, 2→3, 1→2
    for (let caixa = 6; caixa >= 1; caixa--) {
      const lote = lotesAtivos.find(l => l.caixa_atual === caixa);
      if (lote) {
        await supabase
          .from('lotes')
          .update({
            caixa_atual: caixa + 1,
            peso_atual: lote.peso_atual * 0.9685 // Redução de 3.15%
          })
          .eq('id', lote.id);
      }
    }
  };

  const registrarManejo = async (fotoUrls: string[]) => {
    if (!user) return;

    // Registrar operações no banco
    const operacoes = [];

    // Finalização da caixa 7
    const lote7 = lotesAtivos.find(l => l.caixa_atual === 7);
    if (lote7) {
        operacoes.push({
          lote_id: lote7.id,
          user_id: user.id,
          caixa_origem: 7,
          caixa_destino: null,
          peso_antes: lote7.peso_atual,
          peso_depois: lote7.peso_atual * 0.9685, // Redução de 3.15%
          foto_url: fotoUrls[0] || null,
          observacoes: `FINALIZAÇÃO - ${observacoes}`,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng
        });
    }

    // Transferências
    for (let caixa = 6; caixa >= 1; caixa--) {
      const lote = lotesAtivos.find(l => l.caixa_atual === caixa);
      if (lote) {
        operacoes.push({
          lote_id: lote.id,
          user_id: user.id,
          caixa_origem: caixa,
          caixa_destino: caixa + 1,
          peso_antes: lote.peso_atual,
          peso_depois: lote.peso_atual * 0.9685, // Redução de 3.15%
          foto_url: fotoUrls[Math.min(caixa - 1, fotoUrls.length - 1)] || null,
          observacoes: `TRANSFERÊNCIA ${caixa}→${caixa + 1} - ${observacoes}`,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng
        });
      }
    }

    // Inserir todas as operações
    const { error } = await supabase
      .from('manejo_semanal')
      .insert(operacoes);

    if (error) {
      throw error;
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

    setLoading(true);
    try {
      // Upload das fotos
      const fotoUrls = await uploadFotos();
      
      // Processar esteira (atualizar lotes)
      await processarEsteira();
      
      // Registrar operações de manejo
      await registrarManejo(fotoUrls);

      toast({
        title: "Manejo concluído!",
        description: "Esteira avançou com sucesso. Caixa 1 está liberada para novos lotes.",
      });

      onManejoCompleto();
      onClose();
    } catch (error) {
      console.error('Erro ao processar manejo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o manejo",
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
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-base text-muted-foreground mb-1">
                    Clique para selecionar fotos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Máximo 10 fotos • JPG, PNG, WebP • Até 10MB cada
                  </p>
                </label>

                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {fotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={foto.preview}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                        {foto.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removerFoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
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
              <div>
                <label htmlFor="observacoes" className="text-sm font-medium mb-2 block">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={handleObservacoesChange}
                  placeholder="Observações sobre o processo de manejo, condições dos lotes, etc..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {localizacao && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Localização: {localizacao.lat.toFixed(6)}, {localizacao.lng.toFixed(6)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleConfirmar}
              disabled={loading || fotos.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Registrar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};