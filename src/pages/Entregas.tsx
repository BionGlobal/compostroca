import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Camera, MapPin, Clock, Plus, Calendar } from 'lucide-react';

const Entregas = () => {
  const [selectedVoluntario, setSelectedVoluntario] = useState('');
  const [peso, setPeso] = useState('');

  // Mock data - será substituído por dados do Supabase
  const voluntarios = [
    { id: 1, nome: 'Maria Silva', balde: '05' },
    { id: 2, nome: 'João Santos', balde: '12' },
    { id: 3, nome: 'Ana Costa', balde: '08' },
  ];

  const entregasRecentes = [
    {
      id: 1,
      voluntario: 'Maria Silva',
      balde: '05',
      peso: 2.3,
      data: '23/07/2024',
      hora: '14:30',
      fotos: 3,
      lote: 'CWB001-15072024-001'
    },
    {
      id: 2,
      voluntario: 'João Santos',
      balde: '12',
      peso: 1.8,
      data: '23/07/2024',
      hora: '10:15',
      fotos: 3,
      lote: 'CWB001-15072024-001'
    },
    {
      id: 3,
      voluntario: 'Ana Costa',
      balde: '08',
      peso: 3.2,
      data: '22/07/2024',
      hora: '16:45',
      fotos: 3,
      lote: 'CWB001-15072024-001'
    },
  ];

  const handleNovaEntrega = () => {
    // Funcionalidade será implementada com integração ao Supabase
    console.log('Nova entrega:', { selectedVoluntario, peso });
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
                  <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                    {voluntario.nome} - Balde {voluntario.balde}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Peso (kg)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="0.0"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Foto 1</span>
            </Button>
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Foto 2</span>
            </Button>
            <Button variant="outline" className="flex-col h-20">
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">Foto 3</span>
            </Button>
          </div>

          <div className="bg-accent p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-success" />
              <span>Localização validada</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Centro, Curitiba - PR
            </p>
          </div>

          <Button 
            onClick={handleNovaEntrega} 
            className="w-full"
            disabled={!selectedVoluntario || !peso}
          >
            Registrar Entrega
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
          {entregasRecentes.map((entrega) => (
            <div
              key={entrega.id}
              className="bg-muted rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{entrega.voluntario}</h4>
                  <p className="text-sm text-muted-foreground">
                    Balde {entrega.balde} • {entrega.peso}kg
                  </p>
                </div>
                <span className="bg-card px-2 py-1 rounded text-xs font-medium">
                  {entrega.fotos} fotos
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{entrega.data}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{entrega.hora}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Lote: {entrega.lote}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Entregas;