import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Camera, Upload, Trash2, Save, X } from 'lucide-react';
import { Entrega } from '@/hooks/useEntregas';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { formatPesoDisplay } from '@/lib/organizationUtils';

interface EditEntregaModalProps {
  entrega: Entrega | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const tiposFoto = [
  { tipo: 'conteudo', label: 'Conteúdo do Balde' },
  { tipo: 'pesagem', label: 'Pesagem' },
  { tipo: 'destino', label: 'Destino' }
] as const;

export const EditEntregaModal = ({ entrega, isOpen, onClose, onSuccess }: EditEntregaModalProps) => {
  const [peso, setPeso] = useState('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);

  // Função para normalizar entrada de peso (lidar com vírgulas e pontos)
  const normalizePesoInput = (value: string): string => {
    let normalized = value.trim();
    if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
    normalized = normalized.replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
    }
    return normalized;
  };
  
  const { toast } = useToast();
  const { fotos, uploadFoto, deleteFoto, getFotosByTipo } = useEntregaFotos(entrega?.id);

  useEffect(() => {
    if (entrega) {
      setPeso(entrega.peso.toString());
      setQualidadeResiduo(entrega.qualidade_residuo || 0);
    }
  }, [entrega]);

  const handleSave = async () => {
    if (!entrega) return;

    setLoading(true);
    try {
      // Normalizar e validar peso
      const pesoNormalizado = normalizePesoInput(peso);
      const pesoNumerico = parseFloat(pesoNormalizado);
      
      if (isNaN(pesoNumerico) || pesoNumerico <= 0) {
        throw new Error('Peso deve ser um número válido maior que zero');
      }
      
      if (pesoNumerico > 50) {
        throw new Error('Peso parece muito alto. Verifique se inseriu corretamente (máximo 50kg)');
      }

      const { error } = await supabase
        .from('entregas')
        .update({
          peso: pesoNumerico,
          qualidade_residuo: qualidadeResiduo,
          updated_at: new Date().toISOString()
        })
        .eq('id', entrega.id);

      if (error) throw error;

      // A sincronização é automática via trigger do banco
      console.log('✅ Entrega editada - peso será sincronizado automaticamente via trigger');

      toast({
        title: "Sucesso",
        description: "Entrega atualizada com sucesso!",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar entrega:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a entrega",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, tipo: string) => {
    if (!entrega) return;

    // Verificar se já existe foto deste tipo
    const fotosExistentes = getFotosByTipo(tipo as any);
    if (fotosExistentes.length > 0) {
      // Deletar foto existente primeiro
      await deleteFoto(fotosExistentes[0].id, fotosExistentes[0].foto_url);
    }

    setUploadingFoto(tipo);
    try {
      await uploadFoto(file, tipo as any, entrega.id);
      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto",
        variant: "destructive",
      });
    } finally {
      setUploadingFoto(null);
    }
  };

  const handleDeleteFoto = async (fotoId: string, fotoUrl: string) => {
    try {
      await deleteFoto(fotoId, fotoUrl);
      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto",
        variant: "destructive",
      });
    }
  };

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo 10MB",
        variant: "destructive",
      });
      return;
    }

    // Comprimir se necessário
    let processedFile = file;
    if (file.size > 2 * 1024 * 1024) { // Se maior que 2MB, comprimir
      processedFile = await compressImage(file);
    }

    await handleFileUpload(processedFile, tipo);
    
    // Limpar input
    event.target.value = '';
  };

  if (!entrega) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Editar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados da Entrega */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="text"
                value={peso}
                onChange={(e) => {
                  const normalized = normalizePesoInput(e.target.value);
                  setPeso(normalized);
                }}
                placeholder="Ex: 2.5 ou 2,5"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Peso atual: {formatPesoDisplay(Number(entrega.peso))}
              </p>
            </div>

            <div>
              <Label>Qualidade do Resíduo</Label>
              <StarRating
                value={qualidadeResiduo}
                onChange={setQualidadeResiduo}
              />
            </div>
          </div>

          <Separator />

          {/* Fotos */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos da Entrega
            </h3>

            <div className="grid gap-4">
              {tiposFoto.map(({ tipo, label }) => {
                const fotosDoTipo = getFotosByTipo(tipo);
                const fotoAtual = fotosDoTipo[0];
                const isUploading = uploadingFoto === tipo;

                return (
                  <div key={tipo} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">{label}</Label>
                      <Badge variant={fotoAtual ? "default" : "secondary"}>
                        {fotoAtual ? "Presente" : "Ausente"}
                      </Badge>
                    </div>

                    {fotoAtual && (
                      <div className="relative">
                        <img
                          src={fotoAtual.foto_url}
                          alt={label}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => handleDeleteFoto(fotoAtual.id, fotoAtual.foto_url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileInputChange(e, tipo)}
                        className="hidden"
                        id={`file-${tipo}`}
                        disabled={isUploading}
                      />
                      <label htmlFor={`file-${tipo}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={isUploading}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? 'Enviando...' : (fotoAtual ? 'Substituir' : 'Adicionar')}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};