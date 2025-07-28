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
  Check, 
  AlertTriangle,
  Scale,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (fotos.length + files.length > 10) {
      toast({
        title: "Limite excedido",
        description: "Máximo de 10 fotos permitidas",
        variant: "destructive"
      });
      return;
    }

    const novasFotos: FotoUpload[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }));

    setFotos(prev => [...prev, ...novasFotos]);
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

  const progresso = fotos.length > 0 && observacoes ? 100 : fotos.length > 0 ? 70 : 30;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Registrar Manejo Semanal
          </DialogTitle>
          <div className="space-y-2">
            <Progress value={progresso} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Documente o processo com fotos e informações
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">

          {/* Upload de Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Documentação Fotográfica
                <Badge variant="outline">{fotos.length}/10</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para adicionar fotos ou arraste arquivos aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo 10 fotos (JPG, PNG)
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
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {fotos.map((foto, index) => (
                      <div key={index} className="relative">
                        <img
                          src={foto.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        {foto.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
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


          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="observacoes">Observações do Manejo</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Descreva as condições dos lotes, alterações observadas, etc..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {localizacao && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Localização capturada: {localizacao.lat.toFixed(6)}, {localizacao.lng.toFixed(6)}
                  </div>
                )}
              </div>
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
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              onClick={handleConfirmar}
              disabled={loading || fotos.length === 0 || uploadingAll}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Manejo e Avançar Esteira
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};