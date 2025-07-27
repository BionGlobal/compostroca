import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Camera, RotateCcw, Check, Upload } from 'lucide-react';

interface ManejoCameraProps {
  onPhotoCapture: (file: File) => void;
  onCancel: () => void;
  title: string;
  description: string;
}

export const ManejoCamera: React.FC<ManejoCameraProps> = ({
  onPhotoCapture,
  onCancel,
  title,
  description
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setCameraError('Não foi possível acessar a câmera. Você pode fazer upload de uma foto.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const savePhoto = () => {
    if (!capturedImage) return;

    // Converter dataURL para File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `manejo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        onPhotoCapture(file);
      });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onPhotoCapture(file);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!cameraError ? (
          <div className="relative">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ aspectRatio: '16/9' }}
              />
            ) : (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full rounded-lg"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
            )}
            
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {cameraError}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!cameraError && !capturedImage && (
            <Button
              onClick={capturePhoto}
              className="flex-1"
              size="lg"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar
            </Button>
          )}

          {capturedImage && (
            <>
              <Button
                onClick={retakePhoto}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repetir
              </Button>
              <Button
                onClick={savePhoto}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </>
          )}

          {(cameraError || !capturedImage) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className={capturedImage ? "flex-1" : "flex-1"}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};