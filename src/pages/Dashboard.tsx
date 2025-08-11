import { StatCard } from '@/components/StatCard';
import { CompostingBoxes } from '@/components/CompostingBoxes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, RotateCcw, CheckCircle, Clock, MapPin, Home, Leaf, Sprout } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';

const Dashboard = () => {
  const { stats, loading } = useDashboard();

  // Entregas recentes virão da página /entregas
  const entregasRecentes: any[] = [];

  return (
    <div className="p-4 space-y-6">
      {/* Informações da Unidade */}
      <Card className="bg-gradient-primary text-primary-foreground border-0 organic-hover">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Home className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">Fazenda Urbana do Cajuru</h3>
              <p className="text-sm opacity-90 font-medium">CWB001</p>
              <p className="text-xs opacity-80 mt-1">
                Av. Prefeito Maurício Fruet, 1880 - Cajuru, Curitiba - PR, 82900-010, Brasil
              </p>
            </div>
            <MapPin className="h-5 w-5 opacity-80 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Voluntários Ativos"
          value={loading ? "..." : stats.voluntariosAtivos}
          icon={<Users />}
          variant="primary"
          tooltip="Número total de voluntários cadastrados ativos. Não inclui usuários excluídos ou em soft delete."
        />
        <StatCard
          title="Resíduos (Ton)"
          value={loading ? "..." : stats.residuosColetados.toFixed(2)}
          icon={<Package />}
          description="Processados"
          variant="earth"
          tooltip="Soma do peso atual de todos os lotes (lotes na esteira de compostagem e já finalizados) em toneladas."
        />
        <StatCard
          title="CO2e Evitado (Ton)"
          value={loading ? "..." : stats.co2eEvitado.toFixed(2)}
          icon={<Leaf />}
          description="Sustentabilidade"
          variant="earth"
          tooltip="Soma do peso atual de todos os lotes multiplicado por 0.766 (conforme estudo Embrapa: https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/882162)."
        />
        <StatCard
          title="Composto Produzido (Ton)"
          value={loading ? "..." : stats.compostoProduzido.toFixed(2)}
          icon={<Sprout />}
          description="Resultado final"
          variant="primary"
          tooltip="Soma do peso atual do total de lotes já processados com sucesso e finalizados em toneladas."
        />
        <StatCard
          title="Lotes em Andamento"
          value={loading ? "..." : stats.lotesAndamento}
          icon={<Clock />}
          description="Na esteira"
        />
        <StatCard
          title="Lotes Finalizados"
          value={loading ? "..." : stats.lotesFinalizados}
          icon={<CheckCircle />}
          description="Concluídos"
        />
      </div>

      {/* Processo de Compostagem */}
      <CompostingBoxes />

      {/* Entregas Recentes */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Entregas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entregasRecentes.length === 0 ? (
            <div className="text-center p-6 glass-light rounded-xl">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma entrega registrada ainda
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                As entregas aparecerão aqui conforme forem sendo registradas
              </p>
            </div>
          ) : (
            entregasRecentes.map((entrega, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 glass-light rounded-xl organic-hover border-0"
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
            ))
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;