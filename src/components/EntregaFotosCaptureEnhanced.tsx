import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle, 
  RotateCw,
  Upload,
  ImageIcon,
  Loader2
} from 'lucide-react';
import { useEnhancedCamera } from '@/hooks/useEnhancedCamera';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { EntregaConfirmationModal } from '@/components/EntregaConfirmationModal';
import { cn } from '@/lib/utils';

interface EntregaFotosCaptureEnhancedProps {
  entregaId: string;
  onComplete: () => void;
  onCancel: () => void;
  voluntarioNome: string;
  numeroBalde: number;
  peso: number;
  qualidadeResiduo: number;
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

type FotoStep = 'conteudo' | 'pesagem' | 'destino';
type CaptureMode = 'camera' | 'upload';

export const EntregaFotosCaptureEnhanced: React.FC<EntregaFotosCaptureEnhancedProps> = ({
  entregaId,
  onComplete,
  onCancel,
  voluntarioNome,
  numeroBalde,
  peso,
  qualidadeResiduo,
}) => {
  const [currentStep, setCurrentStep] = useState<FotoStep>('conteudo');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [completedPhotos, setCompletedPhotos] = useState<Array<{ tipo: FotoStep; preview: string }>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    videoRef,
    canvasRef,
    cameraActive,
    currentFacing,
    capabilities,
    cameraError,
    startCamera,
    switchCamera,
    stopCamera,
    capturePhoto,
    getCameraMetadata,
  } = useEnhancedCamera();

  const { uploadFoto, uploading } = useEntregaFotos(entregaId);

  // Get current location for metadata
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  // Start camera on mount and step changes
  useEffect(() => {
    if (captureMode === 'camera') {
      startCamera('back'); // Default to back camera for delivery photos
    }
    
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (captureMode === 'camera' && !capturedImage) {
      startCamera(currentFacing);
    }
  }, [currentStep, captureMode]);

  const handleCapturePhoto = () => {
    const imageData = capturePhoto();
    if (imageData) {
      setCapturedImage(imageData);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const savePhoto = async () => {
    let fileToUpload: File;
    
    if (captureMode === 'camera' && capturedImage) {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      fileToUpload = new File([blob], `${currentStep}_${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else if (captureMode === 'upload' && selectedFile) {
      fileToUpload = selectedFile;
    } else {
      return;
    }

    // Gather metadata
    const gpsCoords = await getCurrentLocation();
    const cameraMetadata = getCameraMetadata();
    
    const metadata = {
      cameraType: captureMode === 'camera' ? currentFacing : 'unknown' as const,
      deviceOrientation: (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
      gpsCoords,
      captureTimestamp: new Date(),
      deviceInfo: cameraMetadata?.deviceInfo,
      imageQuality: 0.9,
      additionalMetadata: {
        captureMode,
        stepOrder: Object.keys(FOTO_INSTRUCTIONS).indexOf(currentStep) + 1,
        cameraMetadata,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
      },
    };

    const success = await uploadFoto(fileToUpload, currentStep, entregaId, metadata);
    
    if (success) {
      // Add to completed photos
      setCompletedPhotos(prev => [...prev, { tipo: currentStep, preview: capturedImage! }]);
      
      setCapturedImage(null);
      setSelectedFile(null);
      
      // Move to next step or show confirmation
      if (currentStep === 'conteudo') {
        setCurrentStep('pesagem');
      } else if (currentStep === 'pesagem') {
        setCurrentStep('destino');
      } else {
        // All photos completed - show confirmation
        stopCamera();
        setShowConfirmation(true);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    
    if (captureMode === 'camera') {
      startCamera(currentFacing);
    }
  };

  const handleSwitchCamera = async () => {
    await switchCamera();
  };

  const switchToCamera = () => {
    setCaptureMode('camera');
    setCapturedImage(null);
    setSelectedFile(null);
    startCamera(currentFacing);
  };

  const switchToUpload = () => {
    setCaptureMode('upload');
    setCapturedImage(null);
    setSelectedFile(null);
    stopCamera();
  };

  const handleConfirmDelivery = () => {
    setShowConfirmation(false);
    onComplete();
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    // Reset to allow re-doing photos if needed
    setCurrentStep('conteudo');
    setCompletedPhotos([]);
    if (captureMode === 'camera') {
      startCamera(currentFacing);
    }
  };

  const currentInstruction = FOTO_INSTRUCTIONS[currentStep];
  const progressStep = Object.keys(FOTO_INSTRUCTIONS).indexOf(currentStep) + 1;
  const totalSteps = Object.keys(FOTO_INSTRUCTIONS).length;

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {currentInstruction.title}
          </CardTitle>
          
          {/* Progress indicator */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index < progressStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Passo {progressStep} de {totalSteps}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {currentInstruction.description}
          </p>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={captureMode === 'camera' ? 'default' : 'ghost'}
              size="sm"
              onClick={switchToCamera}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Câmera
            </Button>
            <Button
              variant={captureMode === 'upload' ? 'default' : 'ghost'}
              size="sm"
              onClick={switchToUpload}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Galeria
            </Button>
          </div>

          {/* Camera/Upload Area - VERTICAL ORIENTATION */}
          <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
            {captureMode === 'camera' ? (
              // Camera Mode
              cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/80">
                  <AlertTriangle className="h-12 w-12 mb-2 text-orange-500" />
                  <p className="text-sm text-white mb-4">{cameraError}</p>
                  <Button
                    onClick={() => startCamera(currentFacing)}
                    variant="outline"
                    size="sm"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              ) : !capturedImage ? (
                <>
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mb-2 text-white animate-spin mx-auto" />
                        <p className="text-white text-sm">Carregando câmera...</p>
                      </div>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Camera controls overlay */}
                  {cameraActive && capabilities.hasMultipleCameras && (
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSwitchCamera}
                        className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Current camera indicator */}
                  {cameraActive && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-black/50 text-white">
                        {currentFacing === 'front' ? 'Frontal' : 'Traseira'}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              // Upload Mode
              !capturedImage ? (
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center p-8 text-center",
                    "border-2 border-dashed border-muted-foreground/30 rounded-lg",
                    "transition-colors duration-200",
                    isDragOver && "border-primary bg-primary/5"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    if (files[0]) handleFileSelect(files[0]);
                  }}
                >
                  <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
                  <p className="text-white mb-2 font-medium">
                    Arraste uma foto aqui
                  </p>
                  <p className="text-sm text-gray-300 mb-4">
                    ou clique para selecionar
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileSelect(file);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher Arquivo
                  </Button>
                </div>
              ) : (
                <img
                  src={capturedImage}
                  alt="Foto selecionada"
                  className="w-full h-full object-cover"
                />
              )
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            {!capturedImage ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                
                {captureMode === 'camera' && (
                  <Button
                    onClick={handleCapturePhoto}
                    disabled={!cameraActive || !!cameraError}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  disabled={uploading}
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
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <EntregaConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmDelivery}
        onCancel={handleCancelConfirmation}
        entregaData={{
          voluntarioNome,
          numeroBalde,
          peso,
          qualidadeResiduo,
          fotos: completedPhotos,
        }}
      />
    </>
  );
};