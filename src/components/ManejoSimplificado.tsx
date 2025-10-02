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
          // Verificar se a URL ainda é válida
          try {
            const response = await fetch(foto.url, { method: 'HEAD' });
            if (response.ok) {
              urlsFotos.push(foto.url);
              continue;
            }
          } catch (error) {
            console.warn(`URL inválida para foto ${i}, reupload necessário:`, error);
          }
        }

        // Marcar como fazendo upload
        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { 
            ...novasFotos[i], 
            uploading: true, 
            error: undefined,
            uploadProgress: 0 
          };
          return novasFotos;
        });

        const fileName = `${user.id}/manejo-${Date.now()}-${i}.jpg`;
        
        console.log(`Iniciando upload da foto ${i + 1}/${fotos.length}:`, fileName);
        
        const { error: uploadError } = await supabase.storage
          .from('manejo-fotos')
          .upload(fileName, foto.file);

        if (uploadError) {
          console.error(`Erro no upload da foto ${i}:`, uploadError);
          
          // Marcar erro
          setFotos(prev => {
            const novasFotos = [...prev];
            novasFotos[i] = { 
              ...novasFotos[i], 
              uploading: false, 
              error: uploadError.message 
            };
            return novasFotos;
          });
          
          throw new Error(`Falha no upload da foto ${i + 1}: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('manejo-fotos')
          .getPublicUrl(fileName);

        // Verificar se a URL é válida
        try {
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`URL gerada inválida: ${response.status}`);
          }
        } catch (error) {
          console.error(`Erro ao validar URL da foto ${i}:`, error);
          
          // Marcar erro
          setFotos(prev => {
            const novasFotos = [...prev];
            novasFotos[i] = { 
              ...novasFotos[i], 
              uploading: false, 
              error: 'URL inválida gerada' 
            };
            return novasFotos;
          });
          
          throw new Error(`URL inválida para foto ${i + 1}`);
        }

        urlsFotos.push(data.publicUrl);
        console.log(`Upload da foto ${i + 1} concluído:`, data.publicUrl);

        // Marcar como concluído
        setFotos(prev => {
          const novasFotos = [...prev];
          novasFotos[i] = { 
            ...novasFotos[i], 
            uploading: false, 
            url: data.publicUrl,
            error: undefined 
          };
          return novasFotos;
        });
      }
    } catch (error) {
      console.error('Erro no upload das fotos:', error);
      throw error;
    }

    console.log(`Todas as ${urlsFotos.length} fotos foram enviadas com sucesso`);
    return urlsFotos;
  };

  const processarEsteira = async (): Promise<boolean> => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return false;
    }

    try {
      // Buscar lotes ativos FRESCOS do banco de dados
      const { data: lotesFrescos, error: fetchError } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', organizacao)
        .in('status', ['ativo', 'em_processamento'])
        .order('caixa_atual');

      if (fetchError) {
        console.error('❌ Erro ao buscar lotes ativos:', fetchError);
        toast({
          title: "Erro ao buscar lotes",
          description: fetchError.message,
          variant: "destructive"
        });
        return false;
      }

      if (!lotesFrescos || lotesFrescos.length === 0) {
        console.warn('⚠️ Nenhum lote ativo encontrado');
        return false;
      }

      console.log(`✅ ${lotesFrescos.length} lotes ativos encontrados para processar`);

      // 1. Finalizar lote da caixa 7 (se existir)
      const lote7 = lotesFrescos.find(l => l.caixa_atual === 7);
      if (lote7) {
        const pesoDepois = Number((lote7.peso_atual * 0.9646).toFixed(2));
        console.log(`🔄 Finalizando lote ${lote7.codigo} (Caixa 7): ${lote7.peso_atual}kg → ${pesoDepois}kg`);

        const { error: updateError } = await supabase
          .from('lotes')
          .update({
            status: 'encerrado',
            peso_atual: pesoDepois,
            peso_final: pesoDepois,
            data_finalizacao: new Date().toISOString(),
            data_encerramento: new Date().toISOString(),
            semana_atual: 7
          })
          .eq('id', lote7.id);

        if (updateError) {
          console.error(`❌ Erro ao finalizar lote ${lote7.codigo}:`, updateError);
          toast({
            title: "Erro ao finalizar lote",
            description: `Falha ao encerrar ${lote7.codigo}: ${updateError.message}`,
            variant: "destructive"
          });
          return false;
        }

        console.log(`✅ Lote ${lote7.codigo} finalizado com sucesso`);
      }

      // 2. Transferir lotes: 6→7, 5→6, 4→5, 3→4, 2→3, 1→2
      for (let caixa = 6; caixa >= 1; caixa--) {
        const lote = lotesFrescos.find(l => l.caixa_atual === caixa);
        if (lote) {
          const pesoDepois = Number((lote.peso_atual * 0.9646).toFixed(2));
          const novaSemana = lote.semana_atual + 1;
          console.log(`🔄 Transferindo lote ${lote.codigo} (Caixa ${caixa} → ${caixa + 1}, Semana ${lote.semana_atual} → ${novaSemana}): ${lote.peso_atual}kg → ${pesoDepois}kg`);

          const { error: updateError } = await supabase
            .from('lotes')
            .update({
              caixa_atual: caixa + 1,
              semana_atual: novaSemana,
              peso_atual: pesoDepois
            })
            .eq('id', lote.id);

          if (updateError) {
            console.error(`❌ Erro ao transferir lote ${lote.codigo}:`, updateError);
            toast({
              title: "Erro ao transferir lote",
              description: `Falha ao mover ${lote.codigo} da caixa ${caixa} para ${caixa + 1}: ${updateError.message}`,
              variant: "destructive"
            });
            return false;
          }

          console.log(`✅ Lote ${lote.codigo} transferido com sucesso`);
        }
      }

      console.log('✅ Esteira processada com sucesso - Caixa 1 está liberada!');
      return true;

    } catch (error) {
      console.error('❌ Erro inesperado ao processar esteira:', error);
      toast({
        title: "Erro crítico",
        description: error instanceof Error ? error.message : "Falha ao processar a esteira",
        variant: "destructive"
      });
      return false;
    }
  };

  const registrarManejo = async (fotoUrls: string[]) => {
    if (!user) return;

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Perfil do usuário não encontrado');
    }

    // 1. Criar sessão compartilhada de manutenção
    const { data: sessao, error: sessaoError } = await supabase
      .from('sessoes_manutencao')
      .insert({
        unidade_codigo: organizacao,
        administrador_id: user.id,
        administrador_nome: profile.full_name,
        data_sessao: new Date().toISOString(),
        fotos_gerais: fotoUrls,
        observacoes_gerais: observacoes || 'Manutenção semanal',
        latitude: localizacao?.lat,
        longitude: localizacao?.lng
      })
      .select()
      .single();

    if (sessaoError || !sessao) {
      console.error('Erro ao criar sessão de manutenção:', sessaoError);
      throw new Error('Falha ao criar sessão de manutenção');
    }

    console.log('Sessão de manutenção criada:', sessao.id);

    // 2. Criar evento de FINALIZAÇÃO para lote da caixa 7 (se existir)
    const lote7 = lotesAtivos.find(l => l.caixa_atual === 7);
    if (lote7) {
      const pesoAntes = lote7.peso_atual;
      const pesoDepois = pesoAntes * 0.9646; // Redução de 3.54%

      const { error: eventoFinalizacaoError } = await supabase
        .from('lote_eventos')
        .insert({
          lote_id: lote7.id,
          sessao_manutencao_id: sessao.id,
          tipo_evento: 'finalizacao',
          etapa_numero: 8,
          data_evento: new Date().toISOString(),
          peso_antes: pesoAntes,
          peso_depois: pesoDepois,
          caixa_origem: 7,
          caixa_destino: null,
          administrador_id: user.id,
          administrador_nome: profile.full_name,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng,
          observacoes: `Compostagem finalizada - ${observacoes || 'Processo concluído'}`,
          fotos_compartilhadas: fotoUrls,
          dados_especificos: {
            peso_final: pesoDepois,
            reducao_percentual: 3.54,
            tempo_total_dias: 49 // 7 semanas
          }
        });

      if (eventoFinalizacaoError) {
        console.error('Erro ao criar evento de finalização:', eventoFinalizacaoError);
      } else {
        console.log(`Evento de finalização criado para lote ${lote7.codigo}`);
      }
    }

    // 3. Criar eventos de MANUTENÇÃO para lotes das caixas 1-6
    for (let caixa = 6; caixa >= 1; caixa--) {
      const lote = lotesAtivos.find(l => l.caixa_atual === caixa);
      if (lote) {
        const pesoAntes = lote.peso_atual;
        const pesoDepois = pesoAntes * 0.9646; // Redução de 3.54%
        const etapaNumero = caixa + 1; // Caixa 1 → etapa 2, caixa 6 → etapa 7

        const { error: eventoManutencaoError } = await supabase
          .from('lote_eventos')
          .insert({
            lote_id: lote.id,
            sessao_manutencao_id: sessao.id,
            tipo_evento: 'manutencao',
            etapa_numero: etapaNumero,
            data_evento: new Date().toISOString(),
            peso_antes: pesoAntes,
            peso_depois: pesoDepois,
            caixa_origem: caixa,
            caixa_destino: caixa + 1,
            administrador_id: user.id,
            administrador_nome: profile.full_name,
            latitude: localizacao?.lat,
            longitude: localizacao?.lng,
            observacoes: `Manutenção Semana ${caixa} - Transferência Caixa ${caixa} → ${caixa + 1} - ${observacoes || 'Manejo semanal realizado'}`,
            fotos_compartilhadas: fotoUrls,
            dados_especificos: {
              semana: caixa,
              reducao_percentual: 3.54
            }
          });

        if (eventoManutencaoError) {
          console.error(`Erro ao criar evento de manutenção para lote ${lote.codigo}:`, eventoManutencaoError);
        } else {
          console.log(`Evento de manutenção (etapa ${etapaNumero}) criado para lote ${lote.codigo}`);
        }
      }
    }

    // 4. Manter registro legacy em manejo_semanal para compatibilidade
    const operacoesLegacy = [];

    if (lote7) {
      operacoesLegacy.push({
        lote_id: lote7.id,
        user_id: user.id,
        caixa_origem: 7,
        caixa_destino: null,
        peso_antes: lote7.peso_atual,
        peso_depois: lote7.peso_atual * 0.9646,
        foto_url: fotoUrls[0] || null,
        observacoes: `FINALIZAÇÃO - ${observacoes}`,
        latitude: localizacao?.lat,
        longitude: localizacao?.lng
      });
    }

    for (let caixa = 6; caixa >= 1; caixa--) {
      const lote = lotesAtivos.find(l => l.caixa_atual === caixa);
      if (lote) {
        operacoesLegacy.push({
          lote_id: lote.id,
          user_id: user.id,
          caixa_origem: caixa,
          caixa_destino: caixa + 1,
          peso_antes: lote.peso_atual,
          peso_depois: lote.peso_atual * 0.9646,
          foto_url: fotoUrls[Math.min(caixa - 1, fotoUrls.length - 1)] || null,
          observacoes: `TRANSFERÊNCIA ${caixa}→${caixa + 1} - ${observacoes}`,
          latitude: localizacao?.lat,
          longitude: localizacao?.lng
        });
      }
    }

    if (operacoesLegacy.length > 0) {
      const { error: legacyError } = await supabase
        .from('manejo_semanal')
        .insert(operacoesLegacy);

      if (legacyError) {
        console.warn('Erro ao inserir registros legacy:', legacyError);
      }
    }
  };

  const retryUpload = async (index: number) => {
    if (!user || index >= fotos.length) return;
    
    const foto = fotos[index];
    
    // Resetar estado de erro
    setFotos(prev => {
      const novasFotos = [...prev];
      novasFotos[index] = { 
        ...novasFotos[index], 
        error: undefined, 
        uploading: true 
      };
      return novasFotos;
    });

    try {
      const fileName = `${user.id}/manejo-retry-${Date.now()}-${index}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('manejo-fotos')
        .upload(fileName, foto.file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('manejo-fotos')
        .getPublicUrl(fileName);

      // Atualizar com sucesso
      setFotos(prev => {
        const novasFotos = [...prev];
        novasFotos[index] = { 
          ...novasFotos[index], 
          uploading: false, 
          url: data.publicUrl,
          error: undefined 
        };
        return novasFotos;
      });

      toast({
        title: "Upload recuperado",
        description: `Foto ${index + 1} enviada com sucesso`,
      });
    } catch (error) {
      console.error(`Erro no retry da foto ${index}:`, error);
      
      setFotos(prev => {
        const novasFotos = [...prev];
        novasFotos[index] = { 
          ...novasFotos[index], 
          uploading: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        };
        return novasFotos;
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
      
      // 2. Processar esteira (atualizar lotes) - CRÍTICO
      const esteiraProcessada = await processarEsteira();
      
      if (!esteiraProcessada) {
        console.error('❌ Falha ao processar esteira - abortando operação');
        toast({
          title: "Erro ao processar esteira",
          description: "A movimentação dos lotes falhou. Verifique os logs e tente novamente.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Esteira processada, registrando eventos de rastreabilidade...');
      
      // 3. Registrar operações de manejo (sessão + eventos)
      await registrarManejo(fotoUrls);
      console.log('✅ Manejo registrado com sucesso!');

      toast({
        title: "Manejo concluído!",
        description: "Esteira avançou com sucesso. Caixa 1 está liberada para novos lotes.",
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
                          src={foto.url || foto.preview}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                          onError={(e) => {
                            console.warn(`Erro ao carregar foto ${index}:`, foto.url || foto.preview);
                            // Fallback para preview se URL falhar
                            if (foto.url && e.currentTarget.src !== foto.preview) {
                              e.currentTarget.src = foto.preview;
                            }
                          }}
                        />
                        
                        {foto.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                            <span className="text-xs text-white">Upload...</span>
                          </div>
                        )}
                        
                        {foto.error && (
                          <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center rounded-lg">
                            <X className="h-4 w-4 text-white mb-1" />
                            <span className="text-xs text-white text-center px-1" title={foto.error}>
                              Erro
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-1 h-5 px-2 text-xs"
                              onClick={() => retryUpload(index)}
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        )}
                        
                        {foto.url && !foto.uploading && !foto.error && (
                          <div className="absolute top-1 left-1">
                            <CheckCheck className="h-3 w-3 text-green-500 bg-white rounded-full p-0.5" />
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