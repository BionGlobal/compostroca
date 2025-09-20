// Componente simples para manter compatibilidade
import { Card, CardContent } from '@/components/ui/card';

export const LoteCard = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">
          Visualização de lotes simplificada
        </div>
      </CardContent>
    </Card>
  );
};