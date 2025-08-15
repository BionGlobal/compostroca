import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Plus, Calendar, Camera, Eye, User, Clock, Package, Edit, AlertTriangle, Scale } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { EntregaFotosUpload } from '@/components/EntregaFotosUpload';
import { EntregaFotosGaleria } from '@/components/EntregaFotosGaleria';
import { EditEntregaModal } from '@/components/EditEntregaModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoteCard } from '@/components/LoteCard';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { IOSPermissionsAlert } from '@/components/IOSPermissionsAlert';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { VoluntarioSkeletonLoader, LoteSkeletonLoader, EntregaSkeletonLoader } from '@/components/ui/skeleton-loader';
import type { Entrega } from '@/hooks/useOrganizationData';

const EntregasOptimized = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [tempEntregaId, setTempEntregaId] = useState<string | null>(null);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { 
    voluntarios, 
    entregas, 
    loteAtivo: loteAtivoCaixa01, 
    loading: dataLoading,
    refetch 
  } = useOrganizationData();
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const { 
    deviceInfo, 
    requestGeolocationAccess, 
    showIOSInstructions 
  } = useIOSPermissions();

  // Filtra voluntários que ainda não fizeram entrega no lote atual
  const availableVoluntarios = voluntarios.filter(v => {
    if (!loteAtivoCaixa01) return true;
    return !entregas.some(entrega => 
      entrega.voluntario_id === v.id && 
      entrega.lote_codigo === loteAtivoCaixa01.codigo
    );
  });
  
  const isFormDisabled = !loteAtivoCaixa01;
  const isSuperAdmin = profile?.user_role === 'super_admin';

  const getCurrentLocation = async (): Promise<GeolocationPosition | null> => {
    console.log('📍 Solicitando geolocalização...');
    const position = await requestGeolocationAccess();
    if (!position && deviceInfo?.isIOS) {
      showIOSInstructions();
    }
    return position;
  };

  const handleFazerFotos = async () => {
    if (!selectedVoluntario || !peso || !user || qualidadeResiduo === 0) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!loteAtivoCaixa01) {
      toast({ title: "Erro", description: "Não há lote ativo na Caixa 01. Inicie um novo lote.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const position = await getCurrentLocation();
      if (!position) {
        toast({ title: "Erro de Localização", description: "Não foi possível obter sua localização.", variant: "destructive" });
        setLoading(false);
        return;
      }
      
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
      toast({ title: "Erro", description: "Não foi possível criar a entrega", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFotosComplete = async () => {
    setShowCamera(false);
    
    if (loteAtivoCaixa01 && peso) {
      const novoPeso = (loteAtivoCaixa01.peso_atual || 0) + parseFloat(peso);
      await supabase.from('lotes').update({ peso_atual: novoPeso }).eq('id', loteAtivoCaixa01.id);
    }
    
    setTempEntregaId(null);
    toast({ title: "Sucesso", description: "Entrega registrada com sucesso!" });

    setSelectedVoluntario('');
    setPeso('');
    setQualidadeResiduo(0);
    
    refetch();
  };

  const handleCancelFotos = async () => {
    if (tempEntregaId) {
      try {
        await supabase.from('entregas').delete().eq('id', tempEntregaId);
        setTempEntregaId(null);
        toast({ title: "Cancelado", description: "Entrega cancelada com sucesso" });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível cancelar a entrega", variant: "destructive" });
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
    refetch();
  };

  if (showCamera && tempEntregaId) {
    return (
      <div className="p-4">
        <EntregaFotosUpload 
          entregaId={tempEntregaId}
          onComplete={handleFotosComplete}
          onCancel={handleCancelFotos}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <IOSPermissionsAlert showOnlyWhenNeeded compact />
      
      {dataLoading.lotes ? <LoteSkeletonLoader /> : <LoteCard />}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Nova Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFormDisabled && !dataLoading.initial && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">É necessário ter um lote ativo para registrar entregas.</span>
            </div>
          )}
          
          <div>
            <Label htmlFor="voluntario">Selecionar Voluntário</Label>
            {dataLoading.voluntarios ? <VoluntarioSkeletonLoader /> : (
              <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario} disabled={isFormDisabled}>
                <SelectTrigger><SelectValue placeholder="Escolha um voluntário" /></SelectTrigger>
                <SelectContent>
                  {availableVoluntarios.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome} {v.numero_balde && `(Balde ${v.numero_balde})`}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {voluntarios.length > availableVoluntarios.length && (
              <p className="text-sm text-muted-foreground mt-1">{voluntarios.length - availableVoluntarios.length} voluntário(s) já fizeram entrega neste lote</p>
            )}
          </div>

          <div>
            <Label htmlFor="peso">Peso (kg)</Label>
            <Input id="peso" type="number" step="0.001" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 10.432" disabled={isFormDisabled} />
          </div>

          <div>
            <Label>Qualidade do Resíduo</Label>
            <StarRating value={qualidadeResiduo} onChange={setQualidadeResiduo} disabled={isFormDisabled} />
          </div>

          <Button onClick={handleFazerFotos} disabled={isFormDisabled || !selectedVoluntario || !peso || qualidadeResiduo === 0 || loading} className="w-full">
            <Camera className="h-4 w-4 mr-2" />{loading ? 'Preparando...' : 'Fazer Fotos'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Entregas Recentes</CardTitle></CardHeader>
        <CardContent>
          {dataLoading.entregas ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <EntregaSkeletonLoader key={i} />)}</div>
          ) : entregas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhuma entrega registrada ainda.</p>
          ) : (
            <div className="space-y-4">
              {/* --- ALTERAÇÃO: LISTA AGORA MOSTRA 20 ITENS --- */}
              {entregas.slice(0, 20).map((entrega) => {
                const voluntario = voluntarios.find(v => v.id === entrega.voluntario_id);
                
                return (
                  <Card key={entrega.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-grow flex items-center gap-3">
                        {/* --- ALTERAÇÃO: ÍCONE SUBSTITUÍDO POR AVATAR --- */}
                        <Avatar className="h-10 w-10 border flex-shrink-0">
                          <AvatarImage src={voluntario?.foto_url || undefined} />
                          <AvatarFallback>
                            {voluntario?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'V'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="font-medium truncate">{voluntario?.nome || 'Voluntário não encontrado'}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <Badge variant="secondary">{formatPesoDisplay(Number(entrega.peso))}</Badge>
                            {entrega.qualidade_residuo && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{entrega.qualidade_residuo}/3</span>
                              </div>
                            )}
                            <span>{new Date(entrega.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            {entrega.latitude && entrega.longitude && (
                              <Badge variant={entrega.geolocalizacao_validada ? 'default' : 'outline'} className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {entrega.geolocalizacao_validada ? 'Validada' : 'Pendente'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center gap-2 w-full sm:w-auto">
                        <EntregaFotosGaleria entregaId={entrega.id} numeroBalde={voluntario?.numero_balde || 0}>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto"><Eye className="h-3 w-3 mr-1" />Ver Fotos</Button>
                        </EntregaFotosGaleria>
                        {isSuperAdmin && (
                          <Button variant="outline" size="sm" onClick={() => handleEditEntrega(entrega)} className="w-full sm:w-auto"><Edit className="h-3 w-3 mr-1" />Editar</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {editingEntrega && (
        <EditEntregaModal entrega={editingEntrega} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={handleEditSuccess} />
      )}
    </div>
  );
};

export default EntregasOptimized;