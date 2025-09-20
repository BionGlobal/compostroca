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
  unidade_nome: string;
  unidade_codigo: string;
  data_finalizacao: string | null;
  co2eq_evitado: number | null;
  hash_integridade: string | null;
  peso_inicial: number | null;
  peso_final: number | null;
  criado_por_nome: string | null;
  total_fotos: number;
  total_entregas: number;
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

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header com Unidade e Código */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{lote.unidade_nome}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {lote.unidade_codigo}
            </Badge>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/lote/auditoria/${lote.codigo_unico}`}>
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

        {/* Grid de Informações */}
        <div className="grid grid-cols-2 gap-4">
          {/* Peso Inicial */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              Peso Inicial
            </div>
            <div className="text-sm font-medium">
              {formatWeight(lote.peso_inicial)}
            </div>
          </div>

          {/* Data Finalização */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Finalização
            </div>
            <div className="text-sm font-medium">
              {formatDate(lote.data_finalizacao)}
            </div>
          </div>
        </div>

        {/* Validador */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            Validador
          </div>
          <div className="text-sm">
            {lote.criado_por_nome || 'Não informado'}
          </div>
        </div>

        {/* Dados - Fotos e Entregas */}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};