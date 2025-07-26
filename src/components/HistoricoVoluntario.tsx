import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, MapPin, ArrowLeft } from 'lucide-react';
import { Voluntario } from '@/hooks/useVoluntarios';
import { useEntregas } from '@/hooks/useEntregas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoVoluntarioProps {
  voluntario: Voluntario;
  onBack: () => void;
}

export const HistoricoVoluntario: React.FC<HistoricoVoluntarioProps> = ({
  voluntario,
  onBack,
}) => {
  const { entregas, loading, getTotalKgByVoluntario, getCountByVoluntario } = useEntregas(voluntario.id);

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalKg = getTotalKgByVoluntario(voluntario.id);
  const totalEntregas = getCountByVoluntario(voluntario.id);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Carregando...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Histórico do Voluntário</h2>
      </div>

      {/* Informações do Voluntário */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={voluntario.foto_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(voluntario.nome)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{voluntario.nome}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Balde {voluntario.numero_balde.toString().padStart(2, '0')}</span>
                <span>•</span>
                <span>{voluntario.unidade}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-earth">{totalKg.toFixed(1)} kg</div>
            <div className="text-sm text-muted-foreground">Total Entregue</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-earth">{totalEntregas}</div>
            <div className="text-sm text-muted-foreground">Entregas</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Entregas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Entregas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entregas.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma entrega realizada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {entregas.map((entrega, index) => (
                <div 
                  key={entrega.id} 
                  className={`p-4 ${index !== entregas.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(entrega.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entrega.created_at), 'HH:mm')}
                      </span>
                    </div>
                    
                    <Badge variant="secondary" className="bg-earth text-earth-foreground">
                      {entrega.peso} kg
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {entrega.lote_codigo && (
                      <div className="text-xs text-muted-foreground">
                        Lote: {entrega.lote_codigo}
                      </div>
                    )}

                    {(entrega.latitude && entrega.longitude) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {entrega.geolocalizacao_validada ? 'Localização validada' : 'Localização registrada'}
                        </span>
                      </div>
                    )}


                    {entrega.observacoes && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {entrega.observacoes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};