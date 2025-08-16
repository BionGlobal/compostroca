import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Shield,
  Globe,
  Eye,
  Download,
  ExternalLink,
  Navigation,
  Image as ImageIcon,
  Copy
} from 'lucide-react';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { useToast } from '@/hooks/use-toast';

interface DeviceTestModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeviceTestModalEnhanced = ({ open, onOpenChange }: DeviceTestModalEnhancedProps) => {
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [cameraTestResult, setCameraTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [locationTestResult, setLocationTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testLocation, setTestLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [testImage, setTestImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  const {
    deviceInfo,
    permissions,
    isCheckingPermissions,
    requestCameraAccess,
    requestGeolocationAccess,
    checkPermissions,
    checkSecureContext,
    showIOSInstructions,
    logDiagnostics
  } = useIOSPermissions();

  const getPermissionStatus = (permission: string) => {
    if (permission === 'granted') {
      return { icon: CheckCircle, color: 'text-green-600', variant: 'default' as const, text: 'Permitido' };
    } else if (permission === 'denied') {
      return { icon: XCircle, color: 'text-red-600', variant: 'destructive' as const, text: 'Negado' };
    } else if (permission === 'prompt') {
      return { icon: AlertTriangle, color: 'text-yellow-600', variant: 'secondary' as const, text: 'Pendente' };
    }
    return { icon: AlertTriangle, color: 'text-gray-600', variant: 'outline' as const, text: 'Desconhecido' };
  };

  const handleRealCameraTest = async () => {
    setIsTestingCamera(true);
    setCameraTestResult('idle');
    setTestProgress(0);
    setTestImage(null);
    
    try {
      setTestProgress(25);
      
      // Solicitar acesso à câmera
      const stream = await requestCameraAccess();
      
      if (!stream) {
        throw new Error('Não foi possível acessar a câmera');
      }
      
      setTestProgress(50);
      
      // Configurar vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        
        setTestProgress(75);
        
        // Capturar foto de teste
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar estabilizar
        
        if (canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (context && video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setTestImage(imageDataUrl);
            setTestProgress(100);
            setCameraTestResult('success');
            
            toast({
              title: "✅ Teste de Câmera Bem-sucedido",
              description: "Foto de teste capturada com sucesso!",
            });
          }
        }
      }
      
      // Parar o stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Erro no teste de câmera:', error);
      setCameraTestResult('error');
      setTestProgress(0);
      
      toast({
        title: "❌ Erro no Teste de Câmera",
        description: error instanceof Error ? error.message : "Falha ao acessar a câmera",
        variant: "destructive",
      });
    } finally {
      setIsTestingCamera(false);
    }
  };

  const handleRealLocationTest = async () => {
    setIsTestingLocation(true);
    setLocationTestResult('idle');
    setTestLocation(null);
    
    try {
      const position = await requestGeolocationAccess();
      
      if (position) {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setTestLocation(coords);
        setLocationTestResult('success');
        
        toast({
          title: "✅ Teste de Localização Bem-sucedido",
          description: `Coordenadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        });
      } else {
        throw new Error('Não foi possível obter a localização');
      }
      
    } catch (error) {
      console.error('Erro no teste de localização:', error);
      setLocationTestResult('error');
      
      toast({
        title: "❌ Erro no Teste de Localização",
        description: error instanceof Error ? error.message : "Falha ao obter localização",
        variant: "destructive",
      });
    } finally {
      setIsTestingLocation(false);
    }
  };

  const copyLocationToClipboard = () => {
    if (testLocation) {
      const coordsText = `${testLocation.lat.toFixed(6)}, ${testLocation.lng.toFixed(6)}`;
      navigator.clipboard.writeText(coordsText);
      toast({
        title: "Coordenadas Copiadas",
        description: "As coordenadas foram copiadas para a área de transferência.",
      });
    }
  };

  const openInMaps = () => {
    if (testLocation) {
      const url = `https://maps.google.com/maps?q=${testLocation.lat},${testLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  const handleRefreshPermissions = async () => {
    await checkPermissions();
    toast({
      title: "Status Atualizado",
      description: "Permissões verificadas novamente.",
    });
  };

  const cameraStatus = getPermissionStatus(permissions.camera);
  const locationStatus = getPermissionStatus(permissions.geolocation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Teste Avançado do Aparelho
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações Detalhadas do Dispositivo */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Informações do Dispositivo
              </h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sistema:</span>
                    <Badge variant="outline">
                      {deviceInfo?.isIOS ? `iOS ${deviceInfo.version}` : 'Outro'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo:</span>
                    <span className="text-xs">{deviceInfo?.deviceModel || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Navegador:</span>
                    <Badge variant={deviceInfo?.isSafari ? 'default' : 'secondary'}>
                      {deviceInfo?.isSafari ? 'Safari' : 'Outro'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PWA:</span>
                    <Badge variant={deviceInfo?.isPWA ? 'default' : 'outline'}>
                      {deviceInfo?.isPWA ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In-App:</span>
                    <Badge variant={deviceInfo?.isInAppBrowser ? 'destructive' : 'default'}>
                      {deviceInfo?.isInAppBrowser ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HTTPS:</span>
                    <Badge variant={deviceInfo?.isHTTPS ? 'default' : 'destructive'}>
                      {deviceInfo?.isHTTPS ? 'Seguro' : 'Inseguro'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Alertas de contexto */}
              {deviceInfo?.isInAppBrowser && (
                <div className="text-xs bg-orange-50 border border-orange-200 p-2 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Navegador In-App Detectado</p>
                      <p className="text-orange-700">Para melhor funcionamento, abra no Safari.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 h-6 text-xs"
                        onClick={() => {
                          const currentUrl = window.location.href;
                          window.open(`x-safari-${currentUrl}`, '_system');
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir no Safari
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* APIs Suportadas */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                APIs Suportadas
              </h3>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${deviceInfo?.supportsMediaDevices ? 'bg-green-500' : 'bg-red-500'}`} />
                  MediaDevices
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${deviceInfo?.supportsGeolocation ? 'bg-green-500' : 'bg-red-500'}`} />
                  Geolocation
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${deviceInfo?.supportsPermissionsAPI ? 'bg-green-500' : 'bg-red-500'}`} />
                  Permissions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teste de Câmera com Preview Real */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Teste de Câmera
                </h3>
                <div className="flex items-center gap-2">
                  <cameraStatus.icon className={`h-4 w-4 ${cameraStatus.color}`} />
                  <Badge variant={cameraStatus.variant}>
                    {cameraStatus.text}
                  </Badge>
                </div>
              </div>

              {/* Preview da câmera */}
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-32 bg-black rounded-lg object-cover hidden"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {testImage && (
                  <div className="space-y-2">
                    <img
                      src={testImage}
                      alt="Foto de teste"
                      className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                    />
                    <p className="text-xs text-green-600 text-center">✅ Foto de teste capturada</p>
                  </div>
                )}
              </div>

              {/* Progress bar durante teste */}
              {isTestingCamera && (
                <div className="space-y-2">
                  <Progress value={testProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Testando câmera... {testProgress}%
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRealCameraTest}
                  disabled={isTestingCamera}
                  className="flex-1"
                >
                  {isTestingCamera ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-3 w-3 mr-2" />
                  )}
                  {isTestingCamera ? 'Testando...' : 'Teste Real'}
                </Button>
                
                {testImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `teste-camera-${Date.now()}.jpg`;
                      link.href = testImage;
                      link.click();
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teste de Localização com Coordenadas Reais */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Teste de Localização
                </h3>
                <div className="flex items-center gap-2">
                  <locationStatus.icon className={`h-4 w-4 ${locationStatus.color}`} />
                  <Badge variant={locationStatus.variant}>
                    {locationStatus.text}
                  </Badge>
                </div>
              </div>

              {/* Resultado do teste de localização */}
              {testLocation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Localização Obtida</span>
                  </div>
                  <div className="text-xs font-mono bg-white border rounded p-2">
                    <p><strong>Latitude:</strong> {testLocation.lat.toFixed(6)}</p>
                    <p><strong>Longitude:</strong> {testLocation.lng.toFixed(6)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyLocationToClipboard}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openInMaps}
                      className="flex-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver no Mapa
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleRealLocationTest}
                disabled={isTestingLocation}
                className="w-full"
              >
                {isTestingLocation ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-3 w-3 mr-2" />
                )}
                {isTestingLocation ? 'Obtendo localização...' : 'Teste Real'}
              </Button>
            </CardContent>
          </Card>

          {/* Ações Gerais */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshPermissions}
              disabled={isCheckingPermissions}
              className="w-full"
            >
              {isCheckingPermissions ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar Status
            </Button>

            {deviceInfo?.isIOS && (permissions.camera === 'denied' || permissions.geolocation === 'denied') && (
              <Button
                variant="secondary"
                onClick={showIOSInstructions}
                className="w-full"
              >
                <Globe className="h-4 w-4 mr-2" />
                Instruções para iOS
              </Button>
            )}

            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="ghost"
                onClick={logDiagnostics}
                className="w-full text-xs"
              >
                Console de Diagnóstico
              </Button>
            )}
          </div>

          {/* Instruções Específicas */}
          {(permissions.camera === 'denied' || permissions.geolocation === 'denied') && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 space-y-2">
                    <p className="font-medium">Permissões Bloqueadas</p>
                    
                    {deviceInfo?.isIOS && (
                      <div className="space-y-1 text-xs">
                        <p className="font-medium">Para corrigir no iOS:</p>
                        {permissions.camera === 'denied' && (
                          <p>• Configurações → Safari → Câmera → Permitir</p>
                        )}
                        {permissions.geolocation === 'denied' && (
                          <p>• Configurações → Privacidade → Serviços de Localização → Safari → Permitir</p>
                        )}
                        <p>• Recarregue a página após alterar</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};