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
import { EntregaFotosUpload } from '@/components/EntregaFotosUpload';
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
  const { entregas, hasDeliveredToCurrentLot, refetch: refetchEntregas } = useEntregas();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { validateAllPhotos } = useEntregaFotos(tempEntregaId || undefined);
  const { loteAtivoCaixa01, atualizarPesoLote } = useLotes();

  const { deviceInfo, requestGeolocationAccess, showIOSInstructions } = useIOSPermissions();

  const availableVoluntarios = voluntarios.filter(v => !hasDeliveredToCurrentLot(v.id, loteAtivoCaixa01?.codigo || null));
  const isFormDisabled = !loteAtivoCaixa01;
  const isSuperAdmin = profile?.user_role === 'super_admin';

  const getCurrentLocation = async () => {
    const position = await requestGeolocationAccess();
    if (!position && deviceInfo?.isIOS) {
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
      const position = await getCurrentLocation();
      if (!position) {
        toast({
          title: "Erro de Localização",
          description: "Não foi possível obter sua localização.",
          variant: "destructive",
        });
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
    } catch {
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
    if (loteAtivoCaixa01 && peso) {
      await atualizarPesoLote(loteAtivoCaixa01.id, loteAtivoCaixa01.peso_atual + parseFloat(peso));
    }
    setTempEntregaId(null);
    toast({ title: "Sucesso", description: "Entrega registrada com sucesso!" });
    setSelectedVoluntario('');
    setPeso('');
    setQualidadeResiduo(0);
    refetchEntregas();
  };

  const handleCancelFotos = async () => {
    if (tempEntregaId) {
      await supabase.from('entregas').delete().eq('id', tempEntregaId);
      setTempEntregaId(null);
      toast({ title: "Cancelado", description: "Entrega cancelada com sucesso" });
    }
    setShowCamera(false);
  };

  const handleEditEntrega = (entrega: Entrega) => {
    setEditingEntrega(entrega);
    setShowEditModal(true);
  };

  if (showCamera && tempEntregaId) {
    return (
      <div className="p-4">
        <EntregaFotosUpload entregaId={tempEntregaId} onComplete={handleFotosComplete} onCancel={handleCancelFotos} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <IOSPermissionsAlert showOnlyWhenNeeded compact />
      <LoteCard />

      {/* Formulário Nova Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Nova Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFormDisabled && (
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4 mb-4 text-sm">
              ⚠️ É necessário ter um lote ativo para registrar entregas.
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
                  {availableVoluntarios.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome} - Balde {v.numero_balde}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input id="peso" type="number" step="0.001" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Ex: 10.432" disabled={isFormDisabled} />
            </div>
            <div>
              <Label>Qualidade do Resíduo</Label>
              <StarRating value={qualidadeResiduo} onChange={setQualidadeResiduo} disabled={isFormDisabled} />
            </div>
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <Label className="text-base font-medium">Fotos da Entrega</Label>
              </div>
              <p className="text-sm text-muted-foreground">Será necessário fazer 3 fotos obrigatórias.</p>
              <Button onClick={handleFazerFotos} disabled={isFormDisabled || !selectedVoluntario || !peso || qualidadeResiduo === 0 || loading} className="w-full" variant="secondary">
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
            <Calendar className="h-5 w-5 text-primary" /> Entregas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entregas.slice(0, 40).map(entrega => {
              const voluntario = voluntarios.find(v => v.id === entrega.voluntario_id);
              const googleMapsUrl = entrega.latitude && entrega.longitude ? `https://maps.google.com/maps?q=${entrega.latitude},${entrega.longitude}` : null;
              const coordsText = entrega.latitude && entrega.longitude ? `${Number(entrega.latitude).toFixed(6)}, ${Number(entrega.longitude).toFixed(6)}` : 'Sem coordenadas';

              return (
                <div key={entrega.id} className="glass-light rounded-xl p-4 space-y-4">
                  {/* Avatar + Nome */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={voluntario?.foto_url} />
                      <AvatarFallback>{voluntario?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight break-words">{voluntario?.nome || 'Voluntário não encontrado'}</h3>
                      <p className="text-sm text-muted-foreground">Balde nº{voluntario?.numero_balde || 'N/A'}</p>
                    </div>
                  </div>
                  <Separator />
                  {/* Peso + Qualidade */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Badge className="bg-green-500 text-white font-bold text-lg px-4 py-2">{formatPesoDisplay(Number(entrega.peso))}</Badge>
                    <div className="flex justify-center sm:justify-end gap-1">
                      {[1, 2, 3].map(star => (
                        <Star key={star} size={20} className={star <= (entrega.qualidade_residuo || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
                      ))}
                    </div>
                  </div>
                  <Separator />
                  {/* Infos */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {new Date(entrega.created_at).toLocaleString('pt-BR')}</div>
                    <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Lote: <span className="font-mono">{entrega.lote_codigo || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {googleMapsUrl ? <a href={googleMapsUrl} target="_blank" className="underline text-primary">{coordsText}</a> : coordsText}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> Validado por: <span className="font-medium">Bion Global</span></div>
                  </div>
                  <Separator />
                  {/* Botões */}
                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <EntregaFotosGaleria entregaId={entrega.id} numeroBalde={voluntario?.numero_balde || 0}>
                      <Button variant="default" className="w-full sm:w-auto"><Eye className="h-4 w-4 mr-2" /> Ver Fotos</Button>
                    </EntregaFotosGaleria>
                    {isSuperAdmin && <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleEditEntrega(entrega)}><Edit className="h-4 w-4 mr-2" /> Editar</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditEntregaModal entrega={editingEntrega} isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingEntrega(null); }} onSuccess={refetchEntregas} />
    </div>
  );
};

export default Entregas;

