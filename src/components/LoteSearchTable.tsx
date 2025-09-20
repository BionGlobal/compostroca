import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Hash } from 'lucide-react';
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
  total_count: number;
}

interface LoteSearchTableProps {
  lotes: LoteFinalizadoResult[];
  loading: boolean;
}

export const LoteSearchTable = ({ lotes, loading }: LoteSearchTableProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatCO2 = (value: number | null) => {
    if (!value) return 'N/A';
    return `${value.toFixed(2)} kg`;
  };

  const formatHash = (hash: string | null) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 8)}...`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border rounded">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum lote finalizado encontrado.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidade</TableHead>
            <TableHead>Cód. do Lote</TableHead>
            <TableHead>Data de Finalização</TableHead>
            <TableHead>Impacto (CO2e)</TableHead>
            <TableHead>Hash</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lotes.map((lote) => (
            <TableRow key={lote.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{lote.unidade_nome}</div>
                  <Badge variant="secondary" className="text-xs">
                    {lote.unidade_codigo}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-mono text-sm">
                  {lote.codigo_unico || lote.codigo}
                </div>
              </TableCell>
              <TableCell>{formatDate(lote.data_finalizacao)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-green-600">
                  {formatCO2(lote.co2eq_evitado)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Hash className="mr-1 h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs">
                    {formatHash(lote.hash_integridade)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/lote/auditoria/${lote.codigo_unico}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Verificar
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};