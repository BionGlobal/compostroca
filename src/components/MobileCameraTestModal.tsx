import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useSimpleMobileCamera } from '@/hooks/useSimpleMobileCamera';
import { SimpleCameraCapture } from '@/components/SimpleCameraCapture';
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
  TestTube,
  Eye,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MobileCameraTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileCameraTestModal: React.FC<MobileCameraTestModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [testPhotos, setTestPhotos] = useState<string[]>([]);
  const [isTestingFlow, setIsTestingFlow] = useState(false);
  const { toast } = useToast();

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
    requestCameraAccess,
    requestGeolocationAccess
  } = useSimpleMobileCamera();

  const getPermissionStatus = (permission: string) => {
    if (permission === 'granted') {
      return { icon: CheckCircle, color: 'text-success', variant: 'default' as const, text: 'Permitido' };
    } else if (permission === 'denied') {
      return { icon: XCircle, color: 'text-destructive', variant: 'destructive' as const, text: 'Negado' };
    } else if (permission === 'prompt') {
      return { icon: AlertTriangle, color: 'text-warning', variant: 'secondary' as const, text: 'Pendente' };
    }
    return { icon: AlertTriangle, color: 'text-muted-foreground', variant: 'outline' as const, text: 'Desconhecido' };
  };

  const handleTestPhoto = async (dataUrl: string, metadata: any) => {
    setTestPhotos(prev => [...prev, dataUrl]);
    toast({
      title: 'Foto de Teste Capturada',
      description: 'Foto salva com sucesso no teste da câmera',
    });
  };

  const handleStartFlowTest = () => {
    setIsTestingFlow(true);
    setActiveTab('flow-test');
  };

  const handleCancelFlowTest = () => {
    setIsTestingFlow(false);
    setActiveTab('overview');
  };

  const handleQuickCameraTest = async () => {
    try {
      await startCamera('environment');
      const result = await capturePhoto();
      setTestPhotos(prev => [...prev, result.dataUrl]);
      stopCamera();
      
      toast({
        title: 'Teste Rápido Concluído',
        description: 'Câmera testada com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro no Teste',
        description: 'Falha ao testar a câmera',
        variant: 'destructive'
      });
    }
  };

  const cameraStatus = getPermissionStatus(permissions.camera);
  const locationStatus = getPermissionStatus(permissions.geolocation);

  if (isTestingFlow) {
    return (
      <SimpleCameraCapture
        onPhotoCapture={handleTestPhoto}
        onCancel={handleCancelFlowTest}
        currentStep={1}
        totalSteps={1}
        instruction={{
          title: 'Teste da Nova Câmera',
          description: 'Capture uma foto para testar o sistema de câmera mobile'
        }}
        className="fixed inset-0 z-50"
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste da Câmera Mobile
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Status</TabsTrigger>
            <TabsTrigger value="quick-test">Teste Rápido</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Status das Permissões */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Status das Permissões
                </h3>
                
                {/* Câmera */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="text-sm">Câmera</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <cameraStatus.icon className={`h-4 w-4 ${cameraStatus.color}`} />
                    <Badge variant={cameraStatus.variant}>
                      {cameraStatus.text}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Localização */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Localização</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <locationStatus.icon className={`h-4 w-4 ${locationStatus.color}`} />
                    <Badge variant={locationStatus.variant}>
                      {locationStatus.text}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Dispositivo */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Dispositivo
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sistema:</span>
                    <Badge variant="outline">
                      {deviceInfo?.platform} {deviceInfo?.version || ''}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelo:</span>
                    <span className="text-xs">{deviceInfo?.deviceModel || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Navegador:</span>
                    <Badge variant={deviceInfo?.isSafari || deviceInfo?.isChrome ? 'default' : 'secondary'}>
                      {deviceInfo?.isSafari ? 'Safari' : deviceInfo?.isChrome ? 'Chrome' : 'Outro'}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In-App:</span>
                    <Badge variant={deviceInfo?.isInAppBrowser ? 'destructive' : 'default'}>
                      {deviceInfo?.isInAppBrowser ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacidades da Câmera */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Capacidades da Câmera
                </h3>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hasFrontCamera ? 'bg-success' : 'bg-destructive'}`} />
                    <span>Câmera Frontal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hasBackCamera ? 'bg-success' : 'bg-destructive'}`} />
                    <span>Câmera Traseira</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${deviceInfo?.supportsMediaDevices ? 'bg-success' : 'bg-destructive'}`} />
                    <span>MediaDevices API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${deviceInfo?.isHTTPS ? 'bg-success' : 'bg-destructive'}`} />
                    <span>Contexto Seguro</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas e Avisos */}
            {deviceInfo?.isInAppBrowser && (
              <Card className="bg-warning/10 border-warning/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning-foreground">Navegador In-App Detectado</p>
                      <p className="text-warning-foreground/80">
                        Para melhor funcionamento, abra no {deviceInfo.isIOS ? 'Safari' : 'Chrome'}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quick-test" className="space-y-4">
            {/* Teste Rápido */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Teste Rápido da Câmera
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  Teste básico que captura uma foto usando a câmera padrão.
                </p>

                <Button
                  onClick={handleQuickCameraTest}
                  disabled={isCapturing || isActive}
                  className="w-full"
                  variant="outline"
                >
                  {isCapturing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  {isCapturing ? 'Capturando...' : 'Teste Rápido'}
                </Button>
              </CardContent>
            </Card>

            {/* Teste do Fluxo Completo */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Teste do Fluxo Completo
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  Teste completo usando a nova interface de câmera mobile-first com todos os recursos.
                </p>

                <Button
                  onClick={handleStartFlowTest}
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Fluxo Completo
                </Button>
              </CardContent>
            </Card>

            {/* Solicitar Permissões */}
            {(permissions.camera !== 'granted' || permissions.geolocation !== 'granted') && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold">Solicitar Permissões</h3>
                  
                  <div className="space-y-2">
                    {permissions.camera !== 'granted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestCameraAccess()}
                      className="w-full"
                    >
                        <Camera className="h-3 w-3 mr-2" />
                        Solicitar Câmera
                      </Button>
                    )}
                    
                    {permissions.geolocation !== 'granted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestGeolocationAccess()}
                        className="w-full"
                      >
                        <MapPin className="h-3 w-3 mr-2" />
                        Solicitar Localização
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Fotos Capturadas ({testPhotos.length})
                </h3>
                
                {testPhotos.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma foto de teste capturada ainda</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {testPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Teste ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}

                {testPhotos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestPhotos([])}
                    className="w-full"
                  >
                    Limpar Fotos de Teste
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Canvas oculto para testes */}
        <div className="hidden">
          <video ref={videoRef} />
          <canvas ref={canvasRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};