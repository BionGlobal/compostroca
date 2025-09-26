import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Camera, Eye, Clock, Edit, AlertTriangle, Scale } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { EntregaFotosUpload } from '@/components/EntregaFotosUpload';
import { EntregaFotosGaleria } from '@/components/EntregaFotosGaleria';
import { EditEntregaModal } from '@/components/EditEntregaModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoteControlCard } from '@/components/LoteControlCard';
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

  const availableVoluntarios = voluntarios.filter(v => {
    if (!loteAtivoCaixa01) return true;
    return !entregas.some(entrega => 
      entrega.voluntario_id === v.id && 
      entrega.lote_codigo === loteAtivoCaixa01.codigo
    );
  });
  
  const isFormDisabled = !loteAtivoCaixa01;
  const isSuperAdmin = profile?.user_role === 'super_admin';

  const getCurrentLocation = async (): Promise<GeolocationPosition> => {
    console.log('📍 Solicitando geolocalização...');
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalização não é suportada pelo seu navegador."));
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
  };

  // Função para sincronizar peso da caixa 1 com soma das entregas em tempo real
  const syncCaixa1Weight = async (loteId: string, loteCodigo: string) => {
    try {
      console.log('⚖️ Sincronizando peso da caixa 1 com entregas...');
      
      // Buscar todas as entregas do lote
      const { data: entregas, error: entregasError } = await supabase
        .from('entregas')
        .select('peso')
        .eq('lote_codigo', loteCodigo)
        .is('deleted_at', null);

      if (entregasError) {
        console.error('❌ Erro ao buscar entregas:', entregasError);
        return;
      }

      // Calcular peso total das entregas
      const pesoTotalEntregas = entregas?.reduce((acc, entrega) => acc + Number(entrega.peso), 0) || 0;
      console.log(`📊 Peso total das entregas: ${pesoTotalEntregas}kg`);

      // Atualizar peso atual do lote (apenas soma das entregas - sem cepilho ainda)
      const { error: updateError } = await supabase
        .from('lotes')
        .update({ peso_atual: pesoTotalEntregas })
        .eq('id', loteId);

      if (updateError) {
        console.error('❌ Erro ao atualizar peso do lote:', updateError);
      } else {
        console.log('✅ Peso da caixa 1 sincronizado com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização de peso:', error);
    }
  };

  const handleFazerFotos = async () => {
    // Validações básicas
    if (!selectedVoluntario || !peso || !user || qualidadeResiduo === 0) {
      toast({ 
        title: "Campos Obrigatórios", 
        description: "Preencha todos os campos antes de continuar", 
        variant: "destructive" 
      });
      return;
    }

    if (!loteAtivoCaixa01) {
      toast({ 
        title: "Lote Necessário", 
        description: "Inicie um novo lote antes de registrar entregas", 
        variant: "destructive" 
      });
      return;
    }

    // Validar se voluntário ainda está disponível
    const isVoluntarioAvailable = availableVoluntarios.some(v => v.id === selectedVoluntario);
    if (!isVoluntarioAvailable) {
      toast({
        title: "Voluntário Indisponível",
        description: "Este voluntário já fez entrega neste lote. Selecione outro.",
        variant: "destructive"
      });
      setSelectedVoluntario('');
      return;
    }

    setLoading(true);
    console.log('📍 Iniciando processo de entrega para voluntário:', selectedVoluntario);

    try {
      // Primeiro, tentar obter localização
      console.log('🗺️ Solicitando geolocalização...');
      const position = await getCurrentLocation();
      console.log('✅ Localização obtida:', position.coords.latitude, position.coords.longitude);
      
      // Depois criar a entrega no banco
      console.log('💾 Criando registro de entrega...');
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

      if (error) {
        console.error('❌ Erro ao criar entrega:', error);
        throw new Error(`Erro no banco: ${error.message}`);
      }

      console.log('✅ Entrega criada com sucesso:', data.id);
      setTempEntregaId(data.id);
      setShowCamera(true);

    } catch (error: any) {
      console.error('💥 Erro no processo de entrega:', error);
      
      // Reset do estado em caso de erro
      setTempEntregaId(null);
      setShowCamera(false);
      
      // Tratamento específico por tipo de erro
      let title = "Erro";
      let description = "Ocorreu um erro inesperado. Tente novamente.";
      
      if (error.code) {
        // Erro de geolocalização
        title = "Erro de Localização";
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            description = "Permissão de localização negada. Habilite a localização nas configurações do navegador.";
            break;
          case 2: // POSITION_UNAVAILABLE
            description = "Localização indisponível. Verifique sua conexão e sinal de GPS.";
            break;
          case 3: // TIMEOUT
            description = "Tempo limite excedido para obter localização. Tente novamente.";
            break;
          default:
            description = "Erro desconhecido de geolocalização. Tente novamente.";
        }
        
        // Adicionar dica para iOS
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          description += " No iOS, use o Safari diretamente (não links de outros apps).";
        }
      } else if (error.message?.includes('Erro no banco')) {
        // Erro de banco de dados
        title = "Erro no Servidor";
        description = "Não foi possível salvar a entrega. Verifique sua conexão e tente novamente.";
      }

      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000,
      });
      
    } finally {
      setLoading(false);
    }
  };

  const handleFotosComplete = async () => {
    console.log('📸 Finalizando processo de fotos...');
    
    try {
      // Fechar câmera primeiro
      setShowCamera(false);
      
      // Recalcular peso total das entregas em tempo real
      if (loteAtivoCaixa01) {
        await syncCaixa1Weight(loteAtivoCaixa01.id, loteAtivoCaixa01.codigo);
      }
      
      // Limpar estado temporário
      setTempEntregaId(null);
      
      // Resetar formulário
      setSelectedVoluntario('');
      setPeso('');
      setQualidadeResiduo(0);
      
      toast({ 
        title: "Entrega Registrada!", 
        description: "Fotos salvas e dados atualizados com sucesso." 
      });
      
      // Aguardar um pouco antes de atualizar dados
      setTimeout(() => {
        refetch();
      }, 1000);
      
      console.log('✅ Processo de entrega finalizado com sucesso');
      
    } catch (error) {
      console.error('💥 Erro ao finalizar fotos:', error);
      toast({
        title: "Erro",
        description: "Fotos salvas, mas erro ao atualizar dados. Recarregue a página.",
        variant: "destructive"
      });
    }
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

  const handleEditSuccess = async () => {
    // Após edição, sincronizar peso da caixa 1
    if (loteAtivoCaixa01) {
      await syncCaixa1Weight(loteAtivoCaixa01.id, loteAtivoCaixa01.codigo);
    }
    refetch();
  };

  const getInitials = (name?: string | null): string => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
    <PageErrorBoundary pageName="Entregas">
      <div className="p-4 space-y-6">
      <IOSPermissionsAlert showOnlyWhenNeeded compact />
      
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        {dataLoading.lotes ? <LoteSkeletonLoader /> : <LoteControlCard />}
      </div>
      
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
            <Camera className="h-4 w-4 mr-2" />{loading ? 'Aguarde...' : 'Fazer Fotos'}
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
              {entregas.slice(0, 20).map((entrega) => {
                const voluntario = voluntarios.find(v => v.id === entrega.voluntario_id);
                
                return (
                  <Card key={entrega.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-grow flex items-center gap-3">
                        <Avatar className="h-10 w-10 border flex-shrink-0">
                          <AvatarImage src={voluntario?.foto_url || undefined} />
                          <AvatarFallback>{getInitials(voluntario?.nome)}</AvatarFallback>
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
    </PageErrorBoundary>
  );
};

export default EntregasOptimized;