import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, RotateCcw, CheckCircle, Clock, MapPin } from 'lucide-react';

const Dashboard = () => {
  // Mock data - será substituído por dados do Supabase
  const stats = {
    voluntariosAtivos: 12,
    residuosColetados: 156.5,
    lotesAndamento: 2,
    lotesFinalizados: 8,
  };

  const lotesAtivos = [
    {
      codigo: 'CWB001-15072024-001',
      inicio: '15/07/2024',
      caixaAtual: 'Caixa 03',
      previsaoFim: '02/09/2024',
      diasRestantes: 12,
    },
    {
      codigo: 'CWB001-22072024-002',
      inicio: '22/07/2024',
      caixaAtual: 'Caixa 02',
      previsaoFim: '09/09/2024',
      diasRestantes: 19,
    },
  ];

  const entregasRecentes = [
    { voluntario: 'Maria Silva', balde: '05', peso: 2.3, data: '23/07/2024 14:30' },
    { voluntario: 'João Santos', balde: '12', peso: 1.8, data: '23/07/2024 10:15' },
    { voluntario: 'Ana Costa', balde: '08', peso: 3.2, data: '22/07/2024 16:45' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Voluntários Ativos"
          value={stats.voluntariosAtivos}
          icon={<Users />}
          variant="primary"
        />
        <StatCard
          title="Resíduos (kg)"
          value={stats.residuosColetados}
          icon={<Package />}
          description="Este mês"
          variant="earth"
        />
        <StatCard
          title="Lotes em Andamento"
          value={stats.lotesAndamento}
          icon={<Clock />}
        />
        <StatCard
          title="Lotes Finalizados"
          value={stats.lotesFinalizados}
          icon={<CheckCircle />}
        />
      </div>

      {/* Lotes Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Lotes em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lotesAtivos.map((lote) => (
            <div
              key={lote.codigo}
              className="bg-accent rounded-lg p-4 border border-border"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{lote.codigo}</h4>
                <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                  {lote.diasRestantes} dias
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Início: {lote.inicio}</div>
                <div>Status: {lote.caixaAtual}</div>
                <div className="col-span-2">Previsão: {lote.previsaoFim}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Entregas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Entregas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entregasRecentes.map((entrega, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{entrega.voluntario}</p>
                <p className="text-xs text-muted-foreground">
                  Balde {entrega.balde} • {entrega.peso}kg
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{entrega.data}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ação Rápida */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Unidade CWB001</h3>
              <p className="text-sm opacity-90">Centro, Curitiba - PR</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;