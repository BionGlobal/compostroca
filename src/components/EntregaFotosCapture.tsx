import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, AlertTriangle } from 'lucide-react';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';

interface EntregaFotosCaptureProps {
  entregaId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FOTO_INSTRUCTIONS = {
  conteudo: {
    title: "Foto 1: Conteúdo",
    description: "Enquadre o conteúdo do balde juntamente com seu número"
  },
  pesagem: {
    title: "Foto 2: Pesagem", 
    description: "Registre o balde sendo pesado com os dados da balança e seu número"
  },
  destino: {
    title: "Foto 3: Destino",
    description: "Registre o balde sendo despejado na Caixa 1"
  }
};

export const EntregaFotosCapture: React.FC<EntregaFotosCaptureProps> = ({
  entregaId,
  onComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState<'conteudo' | 'pesagem' | 'destino'>('conteudo');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { uploadFoto, uploading, validateAllPhotos } = useEntregaFotos(entregaId);
  const { 
    deviceInfo, 
    permissions, 
    requestCameraAccess, 
    checkSecureContext,
    showIOSInstructions 
  } = useIOSPermissions();

  const startCamera = async () => {
    try {
      // Para o stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      setCameraActive(false);
      setCameraError(null);
      
      // Verificar contexto seguro primeiro
      if (!checkSecureContext()) {
        setCameraError('É necessário usar HTTPS para acessar a câmera.');
        return;
      }
      
      // Usar o hook especializado para iOS
      const mediaStream = await requestCameraAccess();
      
      if (mediaStream) {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          
          // Aguarda o vídeo estar pronto antes de marcar como ativo
          videoRef.current.onloadedmetadata = () => {
            setCameraActive(true);
            console.log('📹 Vídeo da entrega carregado com sucesso');
          };
        }
      } else {
        setCameraError('Não foi possível acessar a câmera.');
        
        // Mostrar instruções específicas para iOS
        if (deviceInfo?.isIOS) {
          showIOSInstructions();
        }
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setCameraError('Erro ao acessar a câmera.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const savePhoto = async () => {
    if (!capturedImage) return;

    // Converter base64 para arquivo
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `${currentStep}_${Date.now()}.jpg`, { type: 'image/jpeg' });

    const success = await uploadFoto(file, currentStep, entregaId);
    
    if (success) {
      setCapturedImage(null);
      
      // Avançar para próxima foto ou finalizar
      if (currentStep === 'conteudo') {
        setCurrentStep('pesagem');
      } else if (currentStep === 'pesagem') {
        setCurrentStep('destino');
      } else {
        // Todas as fotos foram capturadas
        stopCamera();
        onComplete();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    // Reiniciar a câmera após refazer a foto
    startCamera();
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Reinicializar câmera quando o step muda
  useEffect(() => {
    if (currentStep && !capturedImage) {
      startCamera();
    }
  }, [currentStep]);

  const currentInstruction = FOTO_INSTRUCTIONS[currentStep];
  const progressStep = currentStep === 'conteudo' ? 1 : currentStep === 'pesagem' ? 2 : 3;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {currentInstruction.title}
        </CardTitle>
        <div className="flex gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${
                step <= progressStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          {currentInstruction.description}
        </p>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              {deviceInfo?.isIOS && permissions.camera === 'denied' ? (
                <AlertTriangle className="h-12 w-12 mb-2 text-orange-500" />
              ) : (
                <Camera className="h-12 w-12 mb-2 text-muted-foreground" />
              )}
              
              <p className="text-sm text-white mb-4">{cameraError}</p>
              
              {deviceInfo?.isIOS && permissions.camera === 'denied' && (
                <div className="text-xs text-gray-300 space-y-1 max-w-xs">
                  <p className="font-medium">Para habilitar a câmera:</p>
                  <p>Configurações → Safari → Câmera → Permitir</p>
                </div>
              )}
              
              <Button
                onClick={startCamera}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : !capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 justify-center">
          {!capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={capturePhoto}
                disabled={!cameraActive || !!cameraError}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repetir
              </Button>
              
              <Button
                onClick={savePhoto}
                disabled={uploading}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                {uploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};