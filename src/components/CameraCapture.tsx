import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CameraCaptureProps {
  onPhotoCapture: (url: string) => void;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entregaId?: string;
  photoType: 'conteudo' | 'pesagem' | 'destino';
}

interface PhotoExifData {
  captureTime: string;
  deviceInfo: string;
  resolution: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoCapture,
  isOpen,
  onClose,
  title,
  entregaId,
  photoType
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cleanup simples
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
    setCapturedPhoto(null);
    setUploadError(null);
  };

  // Inicializar câmera simplificado
  const startCamera = async () => {
    try {
      // Constraints mais compatíveis
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.oncanplay = () => {
          setIsReady(true);
        };
      }
    } catch (error) {
      console.error('Erro câmera:', error);
      toast({
        title: "Erro na Câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  };

  // Capturar foto simples
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
    cleanup();
  };

  // Função para converter base64 para blob nativamente
  const base64ToBlob = (base64Data: string): Blob => {
    console.log('🔄 Convertendo base64 para blob...');
    
    // Remover prefixo data:image/...;base64,
    const base64String = base64Data.split(',')[1];
    
    // Converter base64 para bytes
    const byteCharacters = atob(base64String);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: 'image/jpeg' });
    console.log('✅ Blob criado:', { size: blob.size, type: blob.type });
    return blob;
  };

  // Sistema de upload robusto e simplificado
  const uploadPhoto = async (retryCount = 0) => {
    if (!capturedPhoto || !user) {
      console.error('❌ Dados faltando para upload:', { capturedPhoto: !!capturedPhoto, user: !!user });
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    const maxRetries = 3;
    const timeoutMs = 30000;
    
    try {
      console.log(`🚀 Iniciando upload - Tentativa ${retryCount + 1}/${maxRetries}`);
      
      // 1. Verificar conectividade básica
      if (!navigator.onLine) {
        throw new Error('Sem conexão com a internet');
      }
      
      // 2. Converter base64 para blob nativamente (sem fetch)
      const blob = base64ToBlob(capturedPhoto);
      
      // 3. Validar tamanho (máx 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('Imagem muito grande (máximo 10MB)');
      }
      
      if (blob.size === 0) {
        throw new Error('Imagem inválida (tamanho zero)');
      }
      
      // 4. Gerar nome único e simples
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${user.id}/${timestamp}_${randomId}_${photoType}.jpg`;
      
      console.log('📤 Fazendo upload:', { 
        filename, 
        size: `${(blob.size / 1024).toFixed(1)}KB`,
        type: blob.type 
      });
      
      // 5. Upload com timeout
      const uploadPromise = supabase.storage
        .from('volunteer-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false, // Não sobrescrever, gerar erro se existir
        });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Upload demorou mais que ${timeoutMs/1000}s`)), timeoutMs)
      );
      
      const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);
      
      if (uploadError) {
        console.error('❌ Erro no Supabase:', uploadError);
        throw new Error(`Upload falhou: ${uploadError.message}`);
      }
      
      if (!uploadData) {
        throw new Error('Upload retornou dados vazios');
      }
      
      console.log('✅ Upload concluído:', uploadData);
      
      // 6. Gerar URL pública
      const { data: urlData } = supabase.storage
        .from('volunteer-photos')
        .getPublicUrl(filename);
      
      if (!urlData?.publicUrl) {
        throw new Error('Falha ao gerar URL pública');
      }
      
      console.log('🔗 URL gerada:', urlData.publicUrl);
      
      // 7. Log dos metadados
      const exifData: PhotoExifData = {
        captureTime: new Date().toISOString(),
        deviceInfo: navigator.userAgent.substring(0, 50),
        resolution: `${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0}`,
      };
      
      console.log('📸 Foto processada:', {
        url: urlData.publicUrl,
        metadata: exifData,
        photoType,
        fileSize: blob.size,
      });
      
      // 8. Callback e feedback
      onPhotoCapture(urlData.publicUrl);
      
      toast({
        title: "✅ Foto Salva!",
        description: `${photoType} capturada com sucesso`,
      });
      
      onClose();
      
    } catch (error: any) {
      console.error(`❌ Erro na tentativa ${retryCount + 1}:`, error);
      
      // Retry com backoff exponencial
      if (retryCount < maxRetries - 1) {
        const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`🔄 Tentando novamente em ${delayMs/1000}s... (${retryCount + 2}/${maxRetries})`);
        
        setTimeout(() => uploadPhoto(retryCount + 1), delayMs);
        return;
      }
      
      // Falha definitiva
      const errorMessage = error.message || 'Erro desconhecido no upload';
      setUploadError(errorMessage);
      
      console.error('💥 Falha definitiva após todas as tentativas:', errorMessage);
      
      toast({
        title: "❌ Erro ao Salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Retomar foto
  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Effect simples
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    }
    return cleanup;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 bg-black">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-medium">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X size={24} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full h-full pt-16">
          {capturedPhoto ? (
            // Preview
            <div className="relative w-full h-full">
              <img
                src={capturedPhoto}
                alt="Foto"
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={retakePhoto}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <RotateCcw size={20} className="mr-2" />
                    Nova Foto
                  </Button>
                  <Button
                    onClick={() => uploadPhoto()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    <Check size={20} className="mr-2" />
                    {isUploading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Camera view
            <div className="relative w-full h-full">
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Carregando câmera...</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isReady && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-6">
                  <div className="flex justify-center">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 text-black"
                    >
                      <Camera size={24} />
                    </Button>
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