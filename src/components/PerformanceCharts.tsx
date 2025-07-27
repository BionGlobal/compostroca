import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Timer,
  Target,
  Gauge
} from 'lucide-react';
import { ProductionMetrics, LoteExtended } from '@/hooks/useLotesManager';

interface PerformanceChartsProps {
  metrics: ProductionMetrics;
  lotesAtivos: LoteExtended[];
  lotesFinalizados: LoteExtended[];
}

export const PerformanceCharts = ({ 
  metrics, 
  lotesAtivos, 
  lotesFinalizados 
}: PerformanceChartsProps) => {
  
  // Dados para gráfico de redução de peso
  const reducaoData = lotesFinalizados.slice(-6).map(lote => ({
    nome: lote.codigo.split('-').pop(),
    inicial: lote.peso_inicial,
    final: lote.peso_atual,
    reducao: lote.reducaoAcumulada,
  }));

  // Dados para distribuição de caixas
  const distribuicaoData = [
    { nome: 'Caixas Ocupadas', valor: metrics.totalLotesAtivos, cor: '#10b981' },
    { nome: 'Caixas Livres', valor: 7 - metrics.totalLotesAtivos, cor: '#f3f4f6' },
  ];

  // Dados de produção mensal (mock - seria calculado com dados reais)
  const producaoMensal = [
    { mes: 'Jan', producao: 45.2, meta: 50 },
    { mes: 'Fev', producao: 52.1, meta: 50 },
    { mes: 'Mar', producao: 48.7, meta: 50 },
    { mes: 'Abr', producao: 61.3, meta: 55 },
    { mes: 'Mai', producao: 58.9, meta: 55 },
    { mes: 'Jun', producao: 65.4, meta: 60 },
  ];

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  const getMetricIcon = (metrica: string) => {
    switch (metrica) {
      case 'capacidade':
        return <Gauge className="h-4 w-4" />;
      case 'eficiencia':
        return <Target className="h-4 w-4" />;
      case 'tempo':
        return <Timer className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getMetricColor = (valor: number, tipo: string) => {
    switch (tipo) {
      case 'capacidade':
        if (valor >= 85) return 'text-destructive';
        if (valor >= 70) return 'text-warning';
        return 'text-success';
      case 'eficiencia':
        if (valor >= 20) return 'text-success';
        if (valor >= 15) return 'text-warning';
        return 'text-destructive';
      case 'transferencia':
        if (valor >= 90) return 'text-success';
        if (valor >= 70) return 'text-warning';
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-light border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Capacidade</p>
                <p className={`text-lg font-bold ${getMetricColor(metrics.capacidadeUtilizada, 'capacidade')}`}>
                  {formatNumber(metrics.capacidadeUtilizada, 0)}%
                </p>
              </div>
              {getMetricIcon('capacidade')}
            </div>
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary rounded-full h-1.5 transition-all duration-500"
                  style={{ width: `${metrics.capacidadeUtilizada}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-light border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Eficiência</p>
                <p className={`text-lg font-bold ${getMetricColor(metrics.eficienciaReducao, 'eficiencia')}`}>
                  {formatNumber(metrics.eficienciaReducao, 1)}%
                </p>
              </div>
              {getMetricIcon('eficiencia')}
            </div>
            <div className="flex items-center mt-1">
              {metrics.eficienciaReducao >= 20 ? (
                <TrendingUp className="h-3 w-3 text-success mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive mr-1" />
              )}
              <span className="text-xs text-muted-foreground">
                Redução média
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-light border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ciclo Médio</p>
                <p className="text-lg font-bold">
                  {formatNumber(metrics.tempoMedioCiclo, 0)} dias
                </p>
              </div>
              {getMetricIcon('tempo')}
            </div>
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">
                Meta: 49 dias
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-light border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pontualidade</p>
                <p className={`text-lg font-bold ${getMetricColor(metrics.taxaTransferencia, 'transferencia')}`}>
                  {formatNumber(metrics.taxaTransferencia, 0)}%
                </p>
              </div>
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="mt-1">
              <Badge 
                variant={metrics.taxaTransferencia >= 90 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {metrics.taxaTransferencia >= 90 ? 'Excelente' : 'Atenção'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Redução de Peso */}
        <Card className="glass-light border-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Redução de Peso por Lote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reducaoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}${name === 'reducao' ? '%' : 'kg'}`,
                    name === 'inicial' ? 'Peso Inicial' : 
                    name === 'final' ? 'Peso Final' : 'Redução'
                  ]}
                />
                <Bar dataKey="reducao" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Distribuição de Caixas */}
        <Card className="glass-light border-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Ocupação da Esteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribuicaoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="valor"
                >
                  {distribuicaoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} caixas`, '']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Produção Mensal */}
      <Card className="glass-light border-0">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Produção vs Meta (kg/mês)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={producaoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}kg`,
                  name === 'producao' ? 'Produzido' : 'Meta'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="producao" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="meta" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};