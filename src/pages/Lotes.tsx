import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Clock, CheckCircle, ArrowRight, Calendar, Package } from 'lucide-react';

const Lotes = () => {
  // Mock data - será substituído por dados do Supabase
  const lotesAtivos = [
    {
      codigo: 'CWB001-15072024-001',
      inicio: '15/07/2024',
      caixaAtual: 3,
      semanaAtual: 2,
      previsaoFim: '02/09/2024',
      diasRestantes: 12,
      pesoTotal: 45.6,
      status: 'em_andamento'
    },
    {
      codigo: 'CWB001-22072024-002',
      inicio: '22/07/2024',
      caixaAtual: 2,
      semanaAtual: 1,
      previsaoFim: '09/09/2024',
      diasRestantes: 19,
      pesoTotal: 32.1,
      status: 'em_andamento'
    },
  ];

  const lotesFinalizados = [
    {
      codigo: 'CWB001-01062024-001',
      inicio: '01/06/2024',
      fim: '19/07/2024',
      pesoInicial: 52.3,
      pesoFinal: 15.7,
      reducao: 70,
      status: 'distribuido'
    },
    {
      codigo: 'CWB001-08062024-002',
      inicio: '08/06/2024',
      fim: '26/07/2024',
      pesoInicial: 48.9,
      pesoFinal: 14.2,
      reducao: 71,
      status: 'pronto'
    },
  ];

  const semanas = [
    { numero: 1, caixa: 1, status: 'inicio', descricao: 'Início do processo' },
    { numero: 2, caixa: 2, status: 'maturacao', descricao: 'Primeira revirada' },
    { numero: 3, caixa: 3, status: 'maturacao', descricao: 'Segunda revirada' },
    { numero: 4, caixa: 4, status: 'maturacao', descricao: 'Terceira revirada' },
    { numero: 5, caixa: 5, status: 'maturacao', descricao: 'Quarta revirada' },
    { numero: 6, caixa: 6, status: 'maturacao', descricao: 'Quinta revirada' },
    { numero: 7, caixa: 7, status: 'finalizacao', descricao: 'Finalização' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_andamento':
        return 'bg-primary text-primary-foreground';
      case 'pronto':
        return 'bg-success text-success-foreground';
      case 'distribuido':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTimelineStatus = (semanaAtual: number, semana: number) => {
    if (semana < semanaAtual) return 'concluida';
    if (semana === semanaAtual) return 'atual';
    return 'pendente';
  };

  const renderTimeline = (lote: typeof lotesAtivos[0]) => {
    return (
      <div className="space-y-2">
        {semanas.map((semana, index) => {
          const status = getTimelineStatus(lote.semanaAtual, semana.numero);
          return (
            <div key={semana.numero} className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                ${status === 'concluida' ? 'bg-success text-success-foreground' : ''}
                ${status === 'atual' ? 'bg-primary text-primary-foreground' : ''}
                ${status === 'pendente' ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {semana.caixa}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Semana {semana.numero}</p>
                <p className="text-xs text-muted-foreground">{semana.descricao}</p>
              </div>
              {status === 'atual' && (
                <Clock className="h-4 w-4 text-primary" />
              )}
              {status === 'concluida' && (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Lotes Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Lotes em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lotesAtivos.map((lote) => (
            <div key={lote.codigo} className="space-y-4">
              <div className="bg-accent rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{lote.codigo}</h4>
                    <p className="text-sm text-muted-foreground">
                      Início: {lote.inicio}
                    </p>
                  </div>
                  <Badge className={getStatusColor(lote.status)}>
                    {lote.diasRestantes} dias restantes
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Caixa Atual</p>
                    <p className="font-semibold">Caixa {lote.caixaAtual}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peso Total</p>
                    <p className="font-semibold">{lote.pesoTotal}kg</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mb-4">
                  Registrar Manejo Semanal
                </Button>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <h5 className="font-medium mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Timeline do Processo
                </h5>
                {renderTimeline(lote)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lotes Finalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Lotes Finalizados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lotesFinalizados.map((lote) => (
            <div
              key={lote.codigo}
              className="bg-muted rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{lote.codigo}</h4>
                <Badge className={getStatusColor(lote.status)}>
                  {lote.status === 'distribuido' ? 'Distribuído' : 'Pronto'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium">{lote.inicio} - {lote.fim}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inicial/Final</p>
                  <p className="font-medium">{lote.pesoInicial}kg → {lote.pesoFinal}kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Redução</p>
                  <p className="font-medium text-success">{lote.reducao}%</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ação para Novo Lote */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            <div className="flex-1">
              <h3 className="font-semibold">Iniciar Novo Lote</h3>
              <p className="text-sm opacity-90">
                Quando houver resíduos suficientes na Caixa 01
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Iniciar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lotes;