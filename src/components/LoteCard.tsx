import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lote } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoteCardProps {
  lote: Lote;
}

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'ativo': 'default',
  'finalizado': 'secondary',
  'pendente': 'outline',
};

export const LoteCard = ({ lote }: LoteCardProps) => {
  const formattedDate = lote.start_date
    ? format(new Date(lote.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Data não definida';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Lote #{lote.id}</CardTitle>
            <CardDescription>{formattedDate}</CardDescription>
          </div>
          <Badge variant={statusVariantMap[lote.status] || 'default'}>
            {lote.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <h4 className="font-semibold">Pilha de Composto</h4>
          {/* --- CÓDIGO CORRIGIDO --- */}
          {/* Usamos 'lote.pilhas_de_composto?.name' para evitar erros caso a pilha não exista */}
          <p className="text-muted-foreground">{lote.pilhas_de_composto?.name || 'Não associada'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Coletivo</h4>
          {/* --- CÓDIGO CORRIGIDO --- */}
          {/* Usamos 'lote.coletivos?.name' para evitar erros caso o coletivo não exista */}
          <p className="text-muted-foreground">{lote.coletivos?.name || 'Não associado'}</p>
        </div>
      </CardContent>
    </Card>
  );
};
