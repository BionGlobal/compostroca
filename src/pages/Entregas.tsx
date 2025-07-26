import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Plus, Calendar, Camera, Eye, User, Clock, ExternalLink, Package } from 'lucide-react';
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
import { LoteCard } from '@/components/LoteCard';
import { useLotes } from '@/hooks/useLotes';


const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tempEntregaId, setTempEntregaId] = useState<string | null>(null);

  const { voluntarios } = useVoluntarios();
  const { entregas, hasDeliveredToday, hasDeliveredToCurrentLot, refetch: refetchEntregas } = useEntregas();
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateAllPhotos } = useEntregaFotos(tempEntregaId || undefined);
  const { loteAtivoCaixa01, atualizarPesoLote } = useLotes();

  // Filter volunteers who haven't delivered to current lot
  const availableVoluntarios = voluntarios.filter(v => !hasDeliveredToCurrentLot(v.id, loteAtivoCaixa01?.codigo || null));
  
  // Check if form should be disabled (no active lot)
  const isFormDisabled = !loteAtivoCaixa01;

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

    // Verificar se existe lote ativo na Caixa 01
    if (!loteAtivoCaixa01) {
      toast({
        title: "Erro",
        description: "Não há lote ativo na Caixa 01. Inicie um novo lote antes de registrar entregas.",
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
          lote_codigo: loteAtivoCaixa01.codigo,
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

  const handleFotosComplete = async () => {
    setShowCamera(false);
    
    // Atualizar peso do lote ativo
    if (loteAtivoCaixa01 && peso) {
      const novoPeso = loteAtivoCaixa01.peso_atual + parseFloat(peso);
      await atualizarPesoLote(loteAtivoCaixa01.id, novoPeso);
    }
    
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
      {/* Card do Lote */}
      <LoteCard />
      
      {/* Formulário de Nova Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nova Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFormDisabled && (
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4 mb-4">
              <p className="text-orange-800 font-medium">
                ⚠️ É necessário ter um lote ativo para registrar entregas. Inicie um novo lote na seção acima.
              </p>
            </div>
          )}
          
          <div className={`space-y-4 ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label htmlFor="voluntario">Voluntário</Label>
              <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario} disabled={isFormDisabled}>
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
                  {voluntarios.length - availableVoluntarios.length} voluntário(s) já fizeram entrega neste lote
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
                disabled={isFormDisabled}
              />
            </div>

            <div>
              <Label>Qualidade do Resíduo</Label>
              <StarRating
                value={qualidadeResiduo}
                onChange={setQualidadeResiduo}
                disabled={isFormDisabled}
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
                disabled={isFormDisabled || !selectedVoluntario || !peso || qualidadeResiduo === 0 || loading}
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

              const googleMapsUrl = entrega.latitude && entrega.longitude 
                ? `https://maps.google.com/maps?q=${entrega.latitude},${entrega.longitude}`
                : null;

              const coordsText = entrega.latitude && entrega.longitude 
                ? `${Number(entrega.latitude).toFixed(6)}, ${Number(entrega.longitude).toFixed(6)}`
                : 'Sem coordenadas';

              return (
                <div key={entrega.id} className="glass-light rounded-xl p-6 space-y-4">
                  {/* Header - Avatar e Informações do Voluntário */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={voluntario?.foto_url} />
                      <AvatarFallback className="text-lg font-semibold">
                        {voluntario?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight">
                        {voluntario?.nome || 'Voluntário não encontrado'}
                      </h3>
                      <p className="text-base text-muted-foreground">
                        Balde nº{voluntario?.numero_balde || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Peso e Qualidade */}
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-4 py-2">
                        {Number(entrega.peso).toFixed(3)}kg
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {entrega.qualidade_residuo && [1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={star <= entrega.qualidade_residuo! 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Informações de Data e Local */}
                  <div className="space-y-3">
                     <div className="flex items-center gap-3 text-sm">
                       <Clock className="h-4 w-4 text-muted-foreground" />
                       <span className="font-medium">
                         {new Date(entrega.created_at).toLocaleString('pt-BR', {
                           day: '2-digit',
                           month: '2-digit', 
                           year: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         })}
                       </span>
                     </div>
                     
                     <div className="flex items-center gap-3 text-sm">
                       <Package className="h-4 w-4 text-muted-foreground" />
                       <span>Lote: <span className="font-mono font-medium">{entrega.lote_codigo || 'N/A'}</span></span>
                     </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {googleMapsUrl ? (
                        <a 
                          href={googleMapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline text-primary hover:text-primary/80 font-medium"
                        >
                          {coordsText}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{coordsText}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Validado por: <span className="font-medium">Bion Global</span></span>
                    </div>
                  </div>

                  <Separator />

                  {/* Botão Ver Fotos Centralizado */}
                  <div className="flex justify-center pt-2">
                    <EntregaFotosGaleria 
                      entregaId={entrega.id} 
                      numeroBalde={voluntario?.numero_balde || 0}
                    >
                      <Button
                        variant="default"
                        size="default"
                        className="px-8"
                      >
                        <Eye className="h-4 w-4 mr-2" />
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