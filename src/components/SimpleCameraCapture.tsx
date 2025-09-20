import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSimpleMobileCamera } from '@/hooks/useSimpleMobileCamera';
import { 
  Camera, 
  RotateCcw, 
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleCameraCaptureProps {
  onPhotoCapture: (dataUrl: string, metadata: any) => void;
  onCancel: () => void;
  currentStep: number;
  totalSteps: number;
  instruction: {
    title: string;
    description: string;
  };
  className?: string;
}

export const SimpleCameraCapture: React.FC<SimpleCameraCaptureProps> = ({
  onPhotoCapture,
  onCancel,
  currentStep,
  totalSteps,
  instruction,
  className
}) => {
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const {
    isActive,
    isCapturing,
    error,
    facingMode,
    hasFrontCamera,
    hasBackCamera,
    permissions,
    deviceInfo,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    requestCameraAccess
  } = useSimpleMobileCamera();

  // Inicializar câmera automaticamente
  useEffect(() => {
    const initializeCamera = async () => {
      setIsInitializing(true);
      
      try {
        // Solicitar permissões primeiro se estiver no iOS
        if (deviceInfo?.isIOS) {
          await requestCameraAccess();
        }
        
        await startCamera('environment');
      } catch (error) {
        console.log('Fallback para upload:', error);
        setShowUploadOption(true);
      } finally {
        setIsInitializing(false);
      }
    };

    if (deviceInfo) {
      initializeCamera();
    }
  }, [deviceInfo, startCamera, requestCameraAccess]);

  const handleCapturePhoto = async () => {
    try {
      const { dataUrl, metadata } = await capturePhoto();
      setCapturedImage(dataUrl);
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      setShowUploadOption(true);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      onPhotoCapture(capturedImage, {});
      setCapturedImage(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onPhotoCapture(dataUrl, { uploadMethod: 'file' });
      };
      reader.readAsDataURL(file);
    }
  };

  const progressPercentage = ((currentStep) / totalSteps) * 100;

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <Badge variant="secondary" className="mb-1">
              {currentStep} de {totalSteps}
            </Badge>
            <h2 className="text-lg font-semibold text-foreground">
              {instruction.title}
            </h2>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        <Progress value={progressPercentage} className="mb-2" />
        
        <p className="text-sm text-muted-foreground text-center">
          {instruction.description}
        </p>
      </div>

      {/* Área principal de captura */}
      <div className="flex-1 flex flex-col p-4">
        <Card className="flex-1 glass overflow-hidden relative">
          {/* Visualização da câmera ou imagem capturada */}
          {capturedImage ? (
            <div className="h-full flex flex-col">
              <img 
                src={capturedImage} 
                alt="Foto capturada" 
                className="flex-1 w-full object-cover rounded-t-lg"
              />
              
              <div className="p-4 bg-background/95 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRetakePhoto}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Refazer
                  </Button>
                  <Button 
                    onClick={handleConfirmPhoto}
                    className="flex-1 bg-gradient-primary text-primary-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative">
              {/* Vídeo da câmera */}
              {isActive && !error ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="flex-1 w-full object-cover"
                  />
                  
                  {/* Sobreposição com guias visuais */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-full border-2 border-primary/30 rounded-lg m-4"></div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  {isInitializing ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
                    </div>
                  ) : error || showUploadOption ? (
                    <div className="text-center p-6">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {error || 'Câmera não disponível'}
                      </p>
                      
                      {/* Upload de arquivo */}
                      <div className="space-y-3">
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button variant="outline" className="w-full" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Selecionar da Galeria
                            </span>
                          </Button>
                        </label>
                        
                        {/* Tentar câmera novamente */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startCamera('environment')}
                          className="w-full"
                        >
                          Tentar Câmera Novamente
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Controles da câmera */}
        {isActive && !capturedImage && !error && (
          <div className="mt-4 flex items-center justify-center gap-6">
            {/* Trocar câmera */}
            {(hasFrontCamera && hasBackCamera) && (
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                className="rounded-full w-12 h-12"
                disabled={isCapturing}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}

            {/* Botão principal de captura */}
            <Button
              onClick={handleCapturePhoto}
              disabled={isCapturing}
              className="rounded-full w-16 h-16 bg-primary text-primary-foreground shadow-lg"
              size="icon"
            >
              {isCapturing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </Button>

            {/* Upload alternativo */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                asChild
              >
                <span>
                  <Upload className="w-5 h-5" />
                </span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};