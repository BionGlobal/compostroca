import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const HashGeneratorButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateHashes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lote-hashes', {});
      
      if (error) {
        throw error;
      }

      toast({
        title: "Hashes gerados",
        description: `${data.processedCount || 0} hashes de integridade foram gerados com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao gerar hashes:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar hashes de integridade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateHashes}
      disabled={loading}
      size="sm"
      variant="outline"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Shield className="h-4 w-4 mr-2" />
      )}
      Gerar Hashes de Integridade
    </Button>
  );
};