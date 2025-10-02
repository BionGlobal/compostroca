import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { restoreBeltState } from "@/utils/restoreBeltState";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function AdminRestore() {
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    const success = await restoreBeltState();
    setLoading(false);
    
    if (success) {
      setTimeout(() => {
        window.location.href = "/lotes";
      }, 2000);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Restauração Emergencial da Esteira</CardTitle>
          <CardDescription>
            Esta função restaura os lotes para suas posições corretas após o erro de 02/10/2025.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">⚠️ Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Restaurar 6 lotes para status 'em_processamento'</li>
              <li>Reposicionar lotes nas caixas 2-7</li>
              <li>Recalcular pesos com taxa de decaimento correta (3.66%)</li>
              <li>Liberar caixa 1 para novos lotes</li>
            </ul>
          </div>

          <Button 
            onClick={handleRestore} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Restaurando...
              </>
            ) : (
              'Executar Restauração'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Após a restauração, você será redirecionado para a página de lotes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
