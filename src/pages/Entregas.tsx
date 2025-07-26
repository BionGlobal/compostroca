import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Star, Plus, Calendar, Clock } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { useEntregas } from '@/hooks/useEntregas';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { CameraCapture } from '@/components/CameraCapture';

const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  const [fotos, setFotos] = useState<string[]>(['', '', '']);
  const [qualidadeResiduo, setQualidadeResiduo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState<{ open: boolean; type: 'conteudo' | 'pesagem' | 'destino'; index: number }>({
    open: false,
    type: 'conteudo',
    index: 0
  });

  const { voluntarios } = useVoluntarios();
  const { entregas, hasDeliveredToday, refetch: refetchEntregas } = useEntregas();
  const { user } = useAuth();
  const { toast } = useToast();

  // Filter volunteers who haven't delivered today
  const availableVoluntarios = voluntarios.filter(v => !hasDeliveredToday(v.id));

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não é suportada neste navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  const handleNovaEntrega = async () => {
    if (!selectedVoluntario || !peso || !user || qualidadeResiduo === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Check if all 3 photos are captured
    if (fotos.some(foto => !foto)) {
      toast({
        title: "Erro",
        description: "Todas as 3 fotos são obrigatórias",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current location
      const position = await getCurrentLocation();
      
      const { error } = await supabase
        .from('entregas')
        .insert({
          voluntario_id: selectedVoluntario,
          peso: parseFloat(peso),
          fotos: fotos,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          geolocalizacao_validada: true,
          qualidade_residuo: qualidadeResiduo,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Entrega registrada com sucesso!",
      });

      // Reset form
      setSelectedVoluntario('');
      setPeso('');
      setFotos(['', '', '']);
      setQualidadeResiduo(0);
      
      // Refresh data
      refetchEntregas();
    } catch (error) {
      console.error('Erro ao registrar entrega:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a entrega",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = (url: string, index: number) => {
    const newFotos = [...fotos];
    newFotos[index] = url;
    setFotos(newFotos);
  };

  const openCamera = (type: 'conteudo' | 'pesagem' | 'destino', index: number) => {
    setCameraOpen({ open: true, type, index });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Formulário de Nova Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nova Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="voluntario">Voluntário</Label>
              <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um voluntário" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoluntarios.map((voluntario) => (
                    <SelectItem key={voluntario.id} value={voluntario.id}>
                      {voluntario.nome} - Balde {voluntario.numero_balde}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {voluntarios.length > availableVoluntarios.length && (
                <p className="text-sm text-muted-foreground mt-1">
                  {voluntarios.length - availableVoluntarios.length} voluntário(s) já fizeram entrega hoje
                </p>
              )}
            </div>

            <div>
              <Label>Fotos da Entrega</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <Button 
                  variant={fotos[0] ? "default" : "outline"} 
                  className="w-full h-20 flex flex-col items-center justify-center gap-2"
                  type="button"
                  onClick={() => openCamera('conteudo', 0)}
                >
                  {fotos[0] ? (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">✓ Material</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">📦 Material</span>
                    </div>
                  )}
                </Button>
                <Button 
                  variant={fotos[1] ? "default" : "outline"} 
                  className="w-full h-20 flex flex-col items-center justify-center gap-2"
                  type="button"
                  onClick={() => openCamera('pesagem', 1)}
                >
                  {fotos[1] ? (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">✓ Balança</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">⚖️ Balança</span>
                    </div>
                  )}
                </Button>
                <Button 
                  variant={fotos[2] ? "default" : "outline"} 
                  className="w-full h-20 flex flex-col items-center justify-center gap-2"
                  type="button"
                  onClick={() => openCamera('destino', 2)}
                >
                  {fotos[2] ? (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">✓ Local</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera size={20} />
                      <span className="text-xs">🎯 Local</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                step="0.001"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ex: 10.432"
              />
            </div>

            <div>
              <Label>Qualidade do Resíduo</Label>
              <StarRating
                value={qualidadeResiduo}
                onChange={setQualidadeResiduo}
              />
            </div>

            <Button 
              onClick={handleNovaEntrega}
              disabled={!selectedVoluntario || !peso || qualidadeResiduo === 0 || fotos.some(f => !f) || loading}
              className="w-full"
            >
              {loading ? 'Registrando...' : 'Registrar Entrega'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Entregas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Entregas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entregas.slice(0, 5).map((entrega) => {
              const voluntario = voluntarios.find(v => v.id === entrega.voluntario_id);
              return (
                <div key={entrega.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {voluntario?.nome || 'Voluntário não encontrado'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Balde {voluntario?.numero_balde} • {entrega.peso}kg • {entrega.fotos.length} foto(s)
                    </div>
                    {entrega.qualidade_residuo && (
                      <div className="flex items-center gap-1 text-sm">
                        <span>Qualidade:</span>
                        <div className="flex">
                          {[1, 2, 3].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={star <= entrega.qualidade_residuo! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {entrega.latitude && entrega.longitude && (
                      <div className="text-xs text-muted-foreground">
                        <MapPin size={12} className="inline mr-1" />
                        Lat: {entrega.latitude.toFixed(6)}, Lon: {entrega.longitude.toFixed(6)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(entrega.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{entrega.peso}kg</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <CameraCapture
        isOpen={cameraOpen.open}
        onClose={() => setCameraOpen({ ...cameraOpen, open: false })}
        onPhotoCapture={(url) => handlePhotoCapture(url, cameraOpen.index)}
        title={`Foto: ${cameraOpen.type.charAt(0).toUpperCase() + cameraOpen.type.slice(1)}`}
        photoType={cameraOpen.type}
      />
    </div>
  );
};

export default Entregas;