import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Camera, Clock, Plus, Calendar } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { useEntregas } from '@/hooks/useEntregas';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState('');
  const [peso, setPeso] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { voluntarios } = useVoluntarios();
  const { entregas, refetch } = useEntregas();
  const { user } = useAuth();
  const { toast } = useToast();

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não é suportada neste navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  const handleNovaEntrega = async () => {
    if (!selectedVoluntario || !peso || !user) return;

    try {
      setLoading(true);

      // Obter localização atual
      const location = await getCurrentLocation();

      // Registrar entrega no Supabase
      const { error } = await supabase
        .from('entregas')
        .insert({
          voluntario_id: selectedVoluntario,
          peso: parseFloat(peso),
          fotos: fotos,
          latitude: location.latitude,
          longitude: location.longitude,
          geolocalizacao_validada: true,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Entrega registrada com sucesso!",
      });

      // Limpar formulário
      setSelectedVoluntario('');
      setPeso('');
      setFotos([]);
      
      // Atualizar lista de entregas
      refetch();

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
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Voluntário</label>
            <Select value={selectedVoluntario} onValueChange={setSelectedVoluntario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o voluntário" />
              </SelectTrigger>
              <SelectContent>
                {voluntarios.map((voluntario) => (
                  <SelectItem key={voluntario.id} value={voluntario.id}>
                    {voluntario.nome} - Balde {voluntario.numero_balde}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Conteúdo balde</span>
            </Button>
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Pesagem</span>
            </Button>
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Destino (caixa 1)</span>
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Peso (kg)</label>
            <Input
              type="number"
              step="0.001"
              placeholder="0.000"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleNovaEntrega} 
            className="w-full"
            disabled={!selectedVoluntario || !peso || loading}
          >
            {loading ? "Registrando..." : "Registrar Entrega"}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Entregas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Entregas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entregas.map((entrega) => {
            const voluntario = voluntarios.find(v => v.id === entrega.voluntario_id);
            const dataFormatada = new Date(entrega.created_at).toLocaleDateString('pt-BR');
            const horaFormatada = new Date(entrega.created_at).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            return (
              <div
                key={entrega.id}
                className="bg-muted rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{voluntario?.nome || 'Voluntário não encontrado'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Balde {voluntario?.numero_balde} • {Number(entrega.peso).toFixed(3)}kg
                    </p>
                  </div>
                  <span className="bg-card px-2 py-1 rounded text-xs font-medium">
                    {entrega.fotos.length} fotos
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{dataFormatada}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{horaFormatada}</span>
                  </div>
                </div>

                {entrega.lote_codigo && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Lote: {entrega.lote_codigo}
                    </p>
                  </div>
                )}

                {entrega.observacoes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Observações: {entrega.observacoes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default Entregas;