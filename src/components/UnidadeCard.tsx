import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Eye, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UnidadeCardProps {
  id: string;
  codigo_unidade: string;
  nome: string;
  localizacao: string;
  total_lotes: number;
  lotes_ativos: number;
  lotes_finalizados: number;
}

export const UnidadeCard = ({
  codigo_unidade,
  nome,
  localizacao,
  total_lotes,
  lotes_ativos,
  lotes_finalizados
}: UnidadeCardProps) => {
  return (
    <Card className="h-full transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{nome}</CardTitle>
            <CardDescription className="font-mono text-sm text-muted-foreground">
              {codigo_unidade}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {total_lotes} lotes
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4" />
          <span className="line-clamp-2">{localizacao}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-blue-500" />
            <span>{lotes_ativos} ativos</span>
          </div>
          <div className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-green-500" />
            <span>{lotes_finalizados} finalizados</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button asChild className="w-full">
          <Link to={`/${codigo_unidade}`}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Esteira de Produção
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};