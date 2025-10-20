import { StatCard } from '@/components/StatCard';
import { CompostingBoxes } from '@/components/CompostingBoxes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, RotateCcw, CheckCircle, Clock, MapPin, Home, Leaf, Sprout } from 'lucide-react';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { StatsSkeletonLoader } from '@/components/ui/skeleton-loader';

const Dashboard = () => {
  const { stats, loading } = useOrganizationData();

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
        {loading.stats ? (
          [...Array(6)].map((_, i) => <StatsSkeletonLoader key={i} />)
        ) : (
          <>
            <StatCard
              title="Voluntários Ativos"
              value={stats.voluntariosAtivos}
              icon={<Users />}
              variant="primary"
              tooltip="Número total de voluntários cadastrados ativos. Não inclui usuários excluídos ou em soft delete."
            />
            <StatCard
              title="Resíduos (Ton)"
              value={stats.residuosColetados.toFixed(2)}
              icon={<Package />}
              description="Processados"
              variant="earth"
              tooltip="Soma do peso atual de todos os lotes (lotes na esteira de compostagem e já finalizados) em toneladas."
            />
            <StatCard
              title="CO2e Evitado (Ton)"
              value={stats.co2eEvitado.toFixed(2)}
              icon={<Leaf />}
              description="Sustentabilidade"
              variant="earth"
              tooltip="CO2e evitado calculado sobre o peso inicial de todos os lotes (ativos e finalizados) multiplicado por 0.766, conforme estudo Embrapa. Representa o impacto ambiental de desviar os resíduos do aterro sanitário."
            />
            <StatCard
              title="Composto Produzido (Ton)"
              value={stats.compostoProduzido.toFixed(2)}
              icon={<Sprout />}
              description="Resultado final"
              variant="primary"
              tooltip="Soma do peso atual do total de lotes já processados com sucesso e finalizados em toneladas."
            />
            <StatCard
              title="Lotes em Andamento"
              value={stats.lotesAndamento}
              icon={<Clock />}
              description="Na esteira"
            />
            <StatCard
              title="Lotes Finalizados"
              value={stats.lotesFinalizados}
              icon={<CheckCircle />}
              description="Concluídos"
            />
          </>
        )}
      </div>

      {/* Processo de Compostagem */}
      <CompostingBoxes />

    </div>
  );
};

export default Dashboard;