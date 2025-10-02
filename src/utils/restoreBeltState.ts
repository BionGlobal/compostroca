import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function restoreBeltState() {
  try {
    console.log("🔧 Initiating belt state restoration...");

    const mapping = {
      'CWB001-21082025A344': 7,
      'CWB001-28082025A953': 6,
      'CWB001-04092025A730': 5,
      'CWB001-11092025A497': 4,
      'CWB001-19092025A994': 3,
      'CWB001-26092025A582': 2
    };

    const { data, error } = await supabase.functions.invoke('restore-belt-state', {
      body: {
        unidade_codigo: 'CWB001',
        mapping
      }
    });

    if (error) {
      console.error("❌ Restoration failed:", error);
      toast({
        title: "Erro na restauração",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }

    console.log("✅ Restoration complete:", data);
    
    toast({
      title: "Esteira restaurada com sucesso!",
      description: `${data.restored?.length || 0} lotes restaurados. Recarregue a página.`,
    });

    return true;
  } catch (err) {
    console.error("❌ Exception during restoration:", err);
    toast({
      title: "Erro crítico",
      description: String(err),
      variant: "destructive"
    });
    return false;
  }
}
