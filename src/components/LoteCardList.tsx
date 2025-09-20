import { LoteAuditoriaCard } from './LoteAuditoriaCard';
import { Skeleton } from '@/components/ui/skeleton';

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
  total_count: number;
}

interface LoteCardListProps {
  lotes: LoteFinalizadoResult[];
  loading: boolean;
}

export const LoteCardList = ({ lotes, loading }: LoteCardListProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum lote encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {lotes.map((lote) => (
        <LoteAuditoriaCard key={lote.id} lote={lote} />
      ))}
    </div>
  );
};