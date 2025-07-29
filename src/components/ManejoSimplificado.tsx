import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
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
  const [pesos, setPesos] = useState<{ [caixa: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);
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
      setPesos({});
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

      // Inicializar pesos com valores atuais
      const pesosIniciais: { [caixa: number]: number } = {};
      lotesAtivos.forEach(lote => {
        pesosIniciais[lote.caixa_atual] = lote.peso_atual;
      });
      setPesos(pesosIniciais);
    }
  }, [open, lotesAtivos]);

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
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
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (fotos.length + files.length > 10) {
      toast({
        title: "Limite excedido",
        description: "Máximo de 10 fotos permitidas",
        variant: "destructive"
      });
      return;
    }

    // Comprimir e processar imagens
    const fotosComprimidas = await Promise.all(
      files.map(async (file) => {
        const compressedFile = await compressImage(file);
        return {
          file: compressedFile,
          preview: URL.createObjectURL(compressedFile),
          uploading: false
        };
      })
    );

    setFotos(prev => [...prev, ...fotosComprimidas]);
  };

  const removerFoto = (index: number) => {
    setFotos(prev => {
      const novasFotos = [...prev];
      URL.revokeObjectURL(novasFotos[index].preview);
      novasFotos.splice(index, 1);
      return novasFotos;
    });
  };

  const uploadFotos = async (): Promise<string[]> => {
    if (!user) throw new Error('Usuário não autenticado');

    setUploadingAll(true);
    const urlsFotos: string[] = [];

    try {
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (foto.url) {
          urlsFotos.push(foto.url);
          continue;
        }

        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { ...novasFotos[i], uploading: true };
          return novasFotos;
        });

        const fileName = `${user.id}/manejo-${Date.now()}-${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('manejo-fotos')
          .upload(fileName, foto.file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('manejo-fotos')
          .getPublicUrl(fileName);

        urlsFotos.push(data.publicUrl);

        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { ...novasFotos[i], uploading: false, url: data.publicUrl };
          return novasFotos;
        });
      }
    } finally {
      setUploadingAll(false);
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

    if (error) throw error;
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-base text-muted-foreground mb-1">
                    Clique para selecionar fotos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Máximo 10 fotos • JPG, PNG, WebP • Otimização automática
                  </p>
                </div>

                <input
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
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o processo de manejo, condições dos lotes, etc..."
                  rows={4}
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
              disabled={loading || fotos.length === 0 || uploadingAll}
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