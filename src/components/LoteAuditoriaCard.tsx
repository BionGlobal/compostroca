import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Camera, FileText, Scale, Calendar, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface LoteFinalizadoResult {
  id: string;
  codigo_unico: string;
  codigo: string;
  status: string;
  unidade_nome: string;
  unidade_codigo: string;
  data_finalizacao: string | null;
  co2eq_evitado: number | null;
  hash_integridade: string | null;
  peso_inicial: number | null;
  peso_final: number | null;
  peso_atual: number | null;
  criado_por_nome: string | null;
  data_inicio: string | null;
  semana_atual: number | null;
  caixa_atual: number | null;
  progresso_percent: number | null;
  total_fotos: number;
  total_entregas: number;
  total_manutencoes: number | null;
}

interface LoteAuditoriaCardProps {
  lote: LoteFinalizadoResult;
}

export const LoteAuditoriaCard = ({ lote }: LoteAuditoriaCardProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatWeight = (weight: number | null) => {
    if (!weight) return 'N/A';
    return `${weight.toFixed(1)} kg`;
  };

  const isActive = lote.status === 'ativo' || lote.status === 'em_processamento';
  const isFinalized = lote.status === 'encerrado';

  const getStatusBadge = () => {
    if (lote.status === 'ativo') {
      return <Badge className="text-xs bg-green-600 hover:bg-green-700">ATIVO</Badge>;
    }
    if (lote.status === 'em_processamento') {
      return <Badge className="text-xs bg-yellow-600 hover:bg-yellow-700">EM PROCESSAMENTO</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">FINALIZADO</Badge>;
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header com Unidade, Status e Botão */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{lote.unidade_nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {lote.unidade_codigo}
              </Badge>
              {getStatusBadge()}
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/audit/${lote.codigo_unico}`}>
              <ExternalLink className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Ver</span>
            </Link>
          </Button>
        </div>

        {/* Código do Lote */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Código do Lote</div>
          <div className="font-mono text-sm font-medium bg-muted/50 p-2 rounded">
            {lote.codigo_unico || lote.codigo}
          </div>
        </div>

        {/* Progresso para lotes ativos */}
        {isActive && lote.progresso_percent !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso:</span>
              <span className="font-medium">Semana {lote.semana_atual || 1}/7</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${lote.progresso_percent}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Caixa atual: {lote.caixa_atual || 1}
            </p>
          </div>
        )}

        {/* Grid de Informações */}
        <div className="grid grid-cols-2 gap-4">
          {/* Peso */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              {isActive ? 'Peso Atual' : 'Peso Inicial'}
            </div>
            <div className="text-sm font-medium">
              {formatWeight(isActive ? (lote.peso_atual || lote.peso_inicial) : lote.peso_inicial)}
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {isActive ? 'Iniciado em' : 'Finalização'}
            </div>
            <div className="text-sm font-medium">
              {formatDate(isActive ? lote.data_inicio : lote.data_finalizacao)}
            </div>
          </div>
        </div>

        {/* Validador */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {isActive ? 'Responsável' : 'Validador'}
          </div>
          <div className="text-sm">
            {lote.criado_por_nome || 'Não informado'}
          </div>
        </div>

        {/* Dados - Fotos, Entregas e Manutenções */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">Dados</div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Camera className="h-3 w-3 text-muted-foreground" />
              <span>{lote.total_fotos}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span>{lote.total_entregas}</span>
            </div>
            {isActive && lote.total_manutencoes !== null && (
              <div className="flex items-center gap-1 text-xs" title="Manutenções">
                <span>🔧</span>
                <span>{lote.total_manutencoes}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};