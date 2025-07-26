import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Plus, Calendar, Camera, Eye, User, Clock, ExternalLink } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { useEntregas } from '@/hooks/useEntregas';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { EntregaFotosCapture } from '@/components/EntregaFotosCapture';
import { EntregaFotosGaleria } from '@/components/EntregaFotosGaleria';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tempEntregaId, setTempEntregaId] = useState<string | null>(null);

  const { voluntarios } = useVoluntarios();
  const { entregas, hasDeliveredToday, refetch: refetchEntregas } = useEntregas();
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateAllPhotos } = useEntregaFotos(tempEntregaId || undefined);

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

  const handleFazerFotos = async () => {
    if (!selectedVoluntario || !peso || !user || qualidadeResiduo === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current location
      const position = await getCurrentLocation();
      
      const { data, error } = await supabase
        .from('entregas')
        .insert({
          voluntario_id: selectedVoluntario,
          peso: parseFloat(peso),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          geolocalizacao_validada: true,
          qualidade_residuo: qualidadeResiduo,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTempEntregaId(data.id);
      setShowCamera(true);
    } catch (error) {
      console.error('Erro ao criar entrega:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a entrega",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFotosComplete = () => {
    setShowCamera(false);
    setTempEntregaId(null);
    
    toast({
      title: "Sucesso",
      description: "Entrega registrada com sucesso!",
    });

    // Reset form
    setSelectedVoluntario('');
    setPeso('');
    setQualidadeResiduo(0);
    
    // Refresh data
    refetchEntregas();
  };

  const handleCancelFotos = () => {
    setShowCamera(false);
    
    // Delete temporary delivery if it exists
    if (tempEntregaId) {
      supabase
        .from('entregas')
        .delete()
        .eq('id', tempEntregaId)
        .then(() => {
          setTempEntregaId(null);
        });
    }
  };


  if (showCamera && tempEntregaId) {
    return (
      <div className="p-4">
        <EntregaFotosCapture 
          entregaId={tempEntregaId}
          onComplete={handleFotosComplete}
          onCancel={handleCancelFotos}
        />
      </div>
    );
  }

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

            {/* Seção de Fotos da Entrega */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <Label className="text-base font-medium">Fotos da Entrega</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Será necessário fazer 3 fotos obrigatórias: conteúdo do balde, pesagem e destino.
              </p>
              
              <Button 
                onClick={handleFazerFotos}
                disabled={!selectedVoluntario || !peso || qualidadeResiduo === 0 || loading}
                className="w-full"
                variant="secondary"
              >
                <Camera className="h-4 w-4 mr-2" />
                {loading ? 'Preparando...' : 'Fazer Fotos'}
              </Button>
            </div>
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
              const getValidatorName = () => {
                // Se houver user_id, pode buscar o nome do usuário
                // Por ora, usando um nome genérico
                return user?.email?.split('@')[0] || 'Sistema';
              };

              const googleMapsUrl = entrega.latitude && entrega.longitude 
                ? `https://maps.google.com/maps?q=${entrega.latitude},${entrega.longitude}`
                : null;

              return (
                <div key={entrega.id} className="glass-light rounded-lg p-4 space-y-3">
                  {/* Header com Avatar e Badge de Peso */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={voluntario?.foto_url} />
                        <AvatarFallback className="text-sm">
                          {voluntario?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight">
                          {voluntario?.nome || 'Voluntário não encontrado'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Balde nº{voluntario?.numero_balde || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold text-sm px-3 py-1">
                      {entrega.peso}kg
                    </Badge>
                  </div>

                  {/* Qualidade - Estrelas */}
                  {entrega.qualidade_residuo && (
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= entrega.qualidade_residuo! 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground"
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Info Row - Data e Validador */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(entrega.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Validado por: {getValidatorName()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {/* Botão Ver Local */}
                    {googleMapsUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(googleMapsUrl, '_blank')}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Ver Local
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Sem localização
                      </Button>
                    )}

                    {/* Botão Ver Fotos */}
                    <EntregaFotosGaleria 
                      entregaId={entrega.id} 
                      numeroBalde={voluntario?.numero_balde || 0}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Fotos
                      </Button>
                    </EntregaFotosGaleria>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Entregas;