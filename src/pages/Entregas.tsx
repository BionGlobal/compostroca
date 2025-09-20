import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Plus, Calendar, Camera, Eye, User, Clock, Package, Edit } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { useEntregas, Entrega } from '@/hooks/useEntregas';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { EntregaFotosCaptureEnhanced } from '@/components/EntregaFotosCaptureEnhanced';
import { EntregaFotosGaleria } from '@/components/EntregaFotosGaleria';
import { EditEntregaModal } from '@/components/EditEntregaModal';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoteCard } from '@/components/LoteCard';
import { useLotes } from '@/hooks/useLotes';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { IOSPermissionsAlert } from '@/components/IOSPermissionsAlert';

const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tempEntregaId, setTempEntregaId] = useState<string | null>(null);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { voluntarios } = useVoluntarios();
  const { entregas, refetch: refetchEntregas } = useEntregas();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { loteAtivoCaixa01, atualizarPesoLote } = useLotes();
  
  const { requestGeolocationAccess, showIOSInstructions } = useIOSPermissions();

  // Filter volunteers who haven't delivered to the current active lot
  const deliveredVoluntarioIds = new Set(
    entregas
      .filter(e => e.lote_codigo === loteAtivoCaixa01?.codigo)
      .map(e => e.voluntario_id)
  );
  const availableVoluntarios = voluntarios.filter(v => !deliveredVoluntarioIds.has(v.id));
  
  const isFormDisabled = !loteAtivoCaixa01;
  const isSuperAdmin = profile?.user_role === 'super_admin';

  const getCurrentLocation = async (): Promise<GeolocationPosition | null> => {
    console.log('📍 Solicitando geolocalização...');
    const position = await requestGeolocationAccess();
    if (!position) {
      showIOSInstructions();
    }
    return position;
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
      console.log('📸 Iniciando processo de fotos para entrega');
      
      const position = await getCurrentLocation();
      
      if (!position) {
        toast({
          title: "Erro de Localização",
          description: "Não foi possível obter sua localização. Verifique as permissões e tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      console.log('📍 Localização obtida:', position.coords.latitude, position.coords.longitude);
      
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

      console.log('✅ Entrega criada:', data);
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
    console.log('📸 Fotos concluídas, finalizando entrega');
    setShowCamera(false);
    
    if (loteAtivoCaixa01 && peso) {
      const novoPeso = loteAtivoCaixa01.peso_atual + parseFloat(peso);
      console.log('⚖️ Atualizando peso do lote:', loteAtivoCaixa01.peso_atual, '+', parseFloat(peso), '=', novoPeso);
      await atualizarPesoLote(loteAtivoCaixa01.id, novoPeso);
    }
    
    setTempEntregaId(null);
    
    toast({
      title: "Sucesso",
      description: "Entrega registrada com sucesso!",
    });

    setSelectedVoluntario('');
    setPeso('');
    setQualidadeResiduo(0);
    
    refetchEntregas();
  };

  const handleCancelFotos = async () => {
    console.log('❌ Cancelando entrega');
    
    if (tempEntregaId) {
      try {
        const { error } = await supabase
          .from('entregas')
          .delete()
          .eq('id', tempEntregaId);
        
        if (error) throw error;
        
        setTempEntregaId(null);
        toast({
          title: "Cancelado",
          description: "Entrega cancelada com sucesso",
        });
      } catch (error) {
        console.error('Erro ao cancelar entrega:', error);
        toast({
          title: "Erro",
          description: "Não foi possível cancelar a entrega",
          variant: "destructive",
        });
        return;
      }
    }
    
    setShowCamera(false);
  };

  const handleEditEntrega = (entrega: Entrega) => {
    setEditingEntrega(entrega);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    refetchEntregas();
  };

  if (showCamera && tempEntregaId) {
    const selectedVoluntarioData = voluntarios.find(v => v.id === selectedVoluntario);
    
    return (
      <div className="p-4">
        <EntregaFotosCaptureEnhanced 
          entregaId={tempEntregaId}
          onComplete={handleFotosComplete}
          onCancel={handleCancelFotos}
          voluntarioNome={selectedVoluntarioData?.nome || 'Voluntário'}
          numeroBalde={selectedVoluntarioData?.numero_balde || 0}
          peso={parseFloat(peso)}
          qualidadeResiduo={qualidadeResiduo}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <IOSPermissionsAlert showOnlyWhenNeeded compact />
      
      <LoteCard />
      
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
                ? `https://maps.google.com/?q=${entrega.latitude},${entrega.longitude}`
                : null;

              const coordsText = entrega.latitude && entrega.longitude 
                ? `${Number(entrega.latitude).toFixed(6)}, ${Number(entrega.longitude).toFixed(6)}`
                : 'Sem coordenadas';

              return (
                <div key={entrega.id} className="glass-light rounded-xl p-4 md:p-6 space-y-4">
                  {/* Header - Avatar and Volunteer Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-border">
                      <AvatarImage src={voluntario?.foto_url} />
                      <AvatarFallback className="text-lg font-semibold">
                        {voluntario?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate">
                        {voluntario?.nome || 'Voluntário não encontrado'}
                      </h3>
                      <p className="text-base text-muted-foreground">
                        Balde nº{voluntario?.numero_balde || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Weight and Quality - NOW RESPONSIVE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2">
                    <div className="text-center">
                      <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-4 py-2">
                        {formatPesoDisplay(Number(entrega.peso))}
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

                  {/* Date and Location Info */}
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
                    
                    <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        {googleMapsUrl ? (
                          <a 
                            href={googleMapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline text-primary hover:text-primary/80 font-medium break-all"
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

                  {/* Action Buttons - NOW RESPONSIVE */}
                  <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                    <EntregaFotosGaleria 
                      entregaId={entrega.id} 
                      numeroBalde={voluntario?.numero_balde || 0}
                    >
                      <Button
                        variant="default"
                        size="default"
                        className="w-full sm:w-auto px-6"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Fotos
                      </Button>
                    </EntregaFotosGaleria>
                    
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full sm:w-auto px-6"
                        onClick={() => handleEditEntrega(entrega)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditEntregaModal
        entrega={editingEntrega}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntrega(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Entregas;