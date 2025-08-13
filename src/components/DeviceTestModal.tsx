import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Smartphone, 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Shield,
  Globe
} from 'lucide-react';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { useToast } from '@/hooks/use-toast';

interface DeviceTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeviceTestModal = ({ open, onOpenChange }: DeviceTestModalProps) => {
  const [isChecking, setIsChecking] = useState(false);
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

  const handleTestCamera = async () => {
    setIsChecking(true);
    try {
      await requestCameraAccess();
      toast({
        title: "Teste de Câmera",
        description: "Teste concluído. Verifique o status atualizado.",
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: "Não foi possível acessar a câmera.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleTestLocation = async () => {
    setIsChecking(true);
    try {
      await requestGeolocationAccess();
      toast({
        title: "Teste de Localização",
        description: "Teste concluído. Verifique o status atualizado.",
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: "Não foi possível acessar a localização.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefreshPermissions = async () => {
    setIsChecking(true);
    await checkPermissions();
    setIsChecking(false);
    toast({
      title: "Permissões Atualizadas",
      description: "Status das permissões foi verificado novamente.",
    });
  };

  const cameraStatus = getPermissionStatus(permissions.camera);
  const locationStatus = getPermissionStatus(permissions.geolocation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Teste do Aparelho
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações do Dispositivo */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Informações do Dispositivo
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sistema:</span>
                  <Badge variant="outline">
                    {deviceInfo?.isIOS ? 'iOS' : 'Outro'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Navegador:</span>
                  <span className="text-xs font-mono">{deviceInfo?.isSafari ? 'Safari' : 'Outro'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versão:</span>
                  <span className="text-xs">{deviceInfo?.version || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PWA:</span>
                  <Badge variant={deviceInfo?.isPWA ? 'default' : 'outline'}>
                    {deviceInfo?.isPWA ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status de Segurança */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Contexto de Segurança
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">HTTPS:</span>
                <div className="flex items-center gap-2">
                  {deviceInfo?.isHTTPS ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge variant={deviceInfo?.isHTTPS ? 'default' : 'destructive'}>
                    {deviceInfo?.isHTTPS ? 'Seguro' : 'Inseguro'}
                  </Badge>
                </div>
              </div>
              
              {!deviceInfo?.isHTTPS && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Conexão insegura pode impedir o acesso às permissões
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status das Permissões */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissões
              </h3>
              
              {/* Câmera */}
              <div className="space-y-2">
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
                
                {permissions.camera !== 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestCamera}
                    disabled={isChecking}
                    className="w-full"
                  >
                    {isChecking ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                      <Camera className="h-3 w-3 mr-2" />
                    )}
                    Testar Câmera
                  </Button>
                )}
              </div>

              <Separator />

              {/* Localização */}
              <div className="space-y-2">
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
                
                {permissions.geolocation !== 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestLocation}
                    disabled={isChecking}
                    className="w-full"
                  >
                    {isChecking ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-3 w-3 mr-2" />
                    )}
                    Testar Localização
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshPermissions}
              disabled={isCheckingPermissions || isChecking}
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
                Ver Instruções iOS
              </Button>
            )}

            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="ghost"
                onClick={logDiagnostics}
                className="w-full text-xs"
              >
                Log de Diagnóstico (Dev)
              </Button>
            )}
          </div>

          {/* Instruções */}
          {(permissions.camera === 'denied' || permissions.geolocation === 'denied') && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Permissões Negadas</p>
                    <p>Para usar todas as funcionalidades, acesse as configurações do navegador e permita o acesso à câmera e localização para este site.</p>
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