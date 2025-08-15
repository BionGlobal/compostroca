import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Plus, Calendar, Clock, Package, Edit } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { useEntregas } from '@/hooks/useEntregas';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/StarRating';
import { EntregaFotosUpload } from '@/components/EntregaFotosUpload';
import { EntregaFotosGaleria } from '@/components/EntregaFotosGaleria';
import { EditEntregaModal } from '@/components/EditEntregaModal';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useIOSPermissions } from '@/hooks/useIOSPermissions';
import { IOSPermissionsAlert } from '@/components/IOSPermissionsAlert';

export default function Entregas() {
  const [selectedVoluntario, setSelectedVoluntario] = useState('');
  const [peso, setPeso] = useState('');
  const [qualidadeResiduo, setQualidadeResiduo] = useState(0);
  const [editingEntrega, setEditingEntrega] = useState(null);
  const { voluntarios } = useVoluntarios();
  const { entregas, refetch } = useEntregas();
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAndRequestPermissions, showIOSPermissionAlert } = useIOSPermissions();

  const ultimas40 = useMemo(() => {
    return [...entregas]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 40);
  }, [entregas]);

  const handleCreateEntrega = async () => {
    if (!selectedVoluntario || !peso) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('entregas').insert([
      {
        voluntario_id: selectedVoluntario,
        peso: parseFloat(peso),
        qualidade_residuo: qualidadeResiduo,
        created_by: user?.id
      }
    ]);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Entrega registrada com sucesso.' });
      setSelectedVoluntario('');
      setPeso('');
      setQualidadeResiduo(0);
      refetch();
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <IOSPermissionsAlert open={showIOSPermissionAlert} />

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Voluntário</Label>
            <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um voluntário" />
              </SelectTrigger>
              <SelectContent>
                {voluntarios.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Peso (kg)</Label>
            <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} />
          </div>

          <div>
            <Label>Qualidade do Resíduo</Label>
            <StarRating value={qualidadeResiduo} onChange={setQualidadeResiduo} />
          </div>

          <Button onClick={handleCreateEntrega}>
            <Plus className="w-4 h-4 mr-2" /> Salvar Entrega
          </Button>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas 40 Entregas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ultimas40.map((entrega) => (
            <div
              key={entrega.id}
              className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={entrega.voluntario?.foto_url || ''} />
                  <AvatarFallback>{entrega.voluntario?.nome?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium break-words">{entrega.voluntario?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entrega.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{formatPesoDisplay(entrega.peso)}</Badge>
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{entrega.qualidade_residuo}</span>
                <Button variant="outline" size="sm" onClick={() => setEditingEntrega(entrega)}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {editingEntrega && (
        <EditEntregaModal
          entrega={editingEntrega}
          onClose={() => setEditingEntrega(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
}
