import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar API Key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("BEHERO_API_SECRET");

    if (!expectedKey) {
      console.error("BEHERO_API_SECRET not configured");
      return new Response(
        JSON.stringify({ 
          error: "Server Configuration Error", 
          message: "API secret not configured" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      console.warn("Unauthorized access attempt");
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized", 
          message: "Invalid or missing API key" 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Criar cliente Supabase com service role para acesso completo
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chamar a função consolidada de métricas
    const { data: metricas, error } = await supabase.rpc("get_impact_metrics");

    if (error) {
      console.error("Error fetching metrics:", error);
      throw error;
    }

    // Resposta de sucesso com metadados
    const response = {
      success: true,
      data: metricas,
      meta: {
        generated_at: new Date().toISOString(),
        source: "compostroca-api",
        version: "1.0.0",
        endpoint: "impact-metrics",
        documentation: "https://compostroca.lovable.app"
      }
    };

    console.log("Metrics successfully generated:", {
      lotes_finalizados: metricas?.lotes_finalizados,
      co2e_ton: metricas?.co2e_evitado_ton,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300" // Cache por 5 minutos
        } 
      }
    );

  } catch (error) {
    console.error("Impact metrics error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
