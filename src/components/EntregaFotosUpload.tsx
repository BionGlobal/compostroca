import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, AlertTriangle, Upload, ImageIcon } from 'lucide-react';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { cn } from '@/lib/utils';

interface EntregaFotosUploadProps {
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

type CaptureMode = 'camera' | 'upload';

export const EntregaFotosUpload: React.FC<EntregaFotosUploadProps> = ({
  entregaId,
  onComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState<'conteudo' | 'pesagem' | 'destino'>('conteudo');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { uploadFoto, uploading } = useEntregaFotos(entregaId);
  const { 
    deviceInfo, 
    permissions, 
    requestCameraAccess, 
    checkSecureContext,
    showIOSInstructions 
  } = useIOSPermissions();

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      setCameraActive(false);
      setCameraError(null);
      
      if (!checkSecureContext()) {
        setCameraError('É necessário usar HTTPS para acessar a câmera.');
        return;
      }
      
      const mediaStream = await requestCameraAccess();
      
      if (mediaStream) {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          
          videoRef.current.onloadedmetadata = () => {
            setCameraActive(true);
          };
        }
      } else {
        setCameraError('Não foi possível acessar a câmera.');
        
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

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let { width, height } = img;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    
    const compressedFile = await compressImage(file);
    setSelectedFile(compressedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(compressedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
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

    const success = await uploadFoto(fileToUpload, currentStep, entregaId);
    
    if (success) {
      setCapturedImage(null);
      setSelectedFile(null);
      
      if (currentStep === 'conteudo') {
        setCurrentStep('pesagem');
      } else if (currentStep === 'pesagem') {
        setCurrentStep('destino');
      } else {
        stopCamera();
        onComplete();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    
    if (captureMode === 'camera') {
      startCamera();
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const switchToCamera = () => {
    setCaptureMode('camera');
    setCapturedImage(null);
    setSelectedFile(null);
    startCamera();
  };

  const switchToUpload = () => {
    setCaptureMode('upload');
    setCapturedImage(null);
    setSelectedFile(null);
    stopCamera();
  };

  useEffect(() => {
    if (captureMode === 'camera') {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (currentStep && !capturedImage && captureMode === 'camera') {
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

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {captureMode === 'camera' ? (
            // Camera Mode
            cameraError ? (
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
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
              
              {captureMode === 'camera' ? (
                <Button
                  onClick={capturePhoto}
                  disabled={!cameraActive || !!cameraError}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Foto
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {captureMode === 'camera' ? 'Repetir' : 'Trocar'}
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