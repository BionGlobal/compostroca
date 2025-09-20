import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SimpleCameraCapture } from '@/components/SimpleCameraCapture';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { 
  Smartphone, 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Shield,
  TestTube,
  Eye,
  Zap,
  Download
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
  const [currentTestStep, setCurrentTestStep] = useState(1);
  const { toast } = useToast();

  const {
    deviceInfo,
    permissions,
    requestCameraAccess,
    requestGeolocationAccess,
    checkPermissions
  } = useIOSPermissions();

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
    console.log('📸 Foto de teste capturada:', {
      photoSize: dataUrl.length,
      metadata,
      step: currentTestStep
    });
    
    setTestPhotos(prev => [...prev, dataUrl]);
    
    // Simular múltiplas etapas de teste
    if (currentTestStep < 3) {
      setCurrentTestStep(prev => prev + 1);
      toast({
        title: `Foto ${currentTestStep} Capturada`,
        description: `Agora capture a foto ${currentTestStep + 1} para continuar o teste`,
      });
    } else {
      // Finalizar teste
      setIsTestingFlow(false);
      setCurrentTestStep(1);
      setActiveTab('results');
      toast({
        title: 'Teste Completo!',
        description: 'Todas as fotos de teste foram capturadas com sucesso',
      });
    }
  };

  const handleStartFlowTest = () => {
    setCurrentTestStep(1);
    setIsTestingFlow(true);
  };

  const handleCancelFlowTest = () => {
    setIsTestingFlow(false);
    setCurrentTestStep(1);
    setActiveTab('overview');
  };

  const handleRefreshPermissions = async () => {
    await checkPermissions();
    toast({
      title: 'Permissões Atualizadas',
      description: 'Status das permissões foi verificado novamente',
    });
  };

  const downloadPhoto = (photoUrl: string, index: number) => {
    const link = document.createElement('a');
    link.download = `teste-camera-${index + 1}-${Date.now()}.jpg`;
    link.href = photoUrl;
    link.click();
  };

  const cameraStatus = getPermissionStatus(permissions.camera);
  const locationStatus = getPermissionStatus(permissions.geolocation);

  // Se está testando o fluxo, mostrar a interface vertical completa
  if (isTestingFlow) {
    const testInstructions = [
      {
        title: 'Foto de Teste 1',
        description: 'Capture uma foto usando a câmera traseira para testar a qualidade'
      },
      {
        title: 'Foto de Teste 2', 
        description: 'Capture uma foto usando a câmera frontal (se disponível)'
      },
      {
        title: 'Foto de Teste 3',
        description: 'Capture uma foto final para verificar estabilidade da câmera'
      }
    ];

    return (
      <SimpleCameraCapture
        onPhotoCapture={handleTestPhoto}
        onCancel={handleCancelFlowTest}
        currentStep={currentTestStep}
        totalSteps={3}
        instruction={testInstructions[currentTestStep - 1]}
        className="fixed inset-0 z-50 bg-background"
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
            <TabsTrigger value="test">Teste</TabsTrigger>
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshPermissions}
                  className="w-full mt-3"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Atualizar Status
                </Button>
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

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HTTPS:</span>
                    <Badge variant={deviceInfo?.isHTTPS ? 'default' : 'destructive'}>
                      {deviceInfo?.isHTTPS ? 'Seguro' : 'Inseguro'}
                    </Badge>
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

          <TabsContent value="test" className="space-y-4">
            {/* Teste do Fluxo Completo */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Teste da Interface de Entrega
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  Teste completo usando a mesma interface vertical do processo de entrega com todos os recursos: câmera móvel, troca de câmeras, upload de arquivo e captura de metadados.
                </p>

                <Button
                  onClick={handleStartFlowTest}
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Iniciar Teste da Câmera
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

            {/* Dicas para iOS */}
            {deviceInfo?.isIOS && (
              <Card className="bg-accent/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">💡 Dicas para iOS:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use o Safari para melhor compatibilidade</li>
                    <li>• Permita acesso à câmera quando solicitado</li>
                    <li>• Se a câmera não funcionar, verifique as configurações do Safari</li>
                    <li>• Evite navegadores in-app (Instagram, Facebook, etc.)</li>
                  </ul>
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
                    <p className="text-xs mt-1">Vá para a aba "Teste" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      {testPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Teste ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary">
                              Foto {index + 1}
                            </Badge>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadPhoto(photo, index)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestPhotos([])}
                        className="flex-1"
                      >
                        Limpar Fotos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('test')}
                        className="flex-1"
                      >
                        Novo Teste
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas do Teste */}
            {testPhotos.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">📊 Estatísticas do Teste</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total de fotos:</span>
                      <div className="font-medium">{testPhotos.length}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="default" className="ml-1">
                        ✅ Sucesso
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};