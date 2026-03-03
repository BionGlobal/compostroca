import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: validate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } =
      await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Use service role for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, user_role, status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .single();

    if (!profile || profile.user_role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Apenas super_admin pode executar esta ação" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminNome = profile.full_name || "Admin";

    // Parse optional body params
    let unidadeCodigo = "CWB001";
    let motivo =
      "Recesso operacional Dez/2025-Fev/2026. Compostagem completou ciclo natural sem manejo formal registrado. Composto resultante foi distribuído.";
    try {
      const body = await req.json();
      if (body.unidade) unidadeCodigo = body.unidade;
      if (body.motivo) motivo = body.motivo;
    } catch {
      // No body, use defaults
    }

    // Fetch all active lots for the unit
    const { data: lotes, error: lotesError } = await supabase
      .from("lotes")
      .select("*")
      .eq("unidade", unidadeCodigo)
      .in("status", ["ativo", "em_processamento"])
      .is("deleted_at", null)
      .order("caixa_atual", { ascending: true });

    if (lotesError) throw lotesError;
    if (!lotes || lotes.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Nenhum lote ativo encontrado para encerramento",
          unidade: unidadeCodigo,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const agora = new Date();
    const resultados: Array<Record<string, unknown>> = [];

    for (const lote of lotes) {
      // Calculate real decay from last known weight
      const updatedAt = new Date(lote.updated_at || lote.created_at);
      const diasDesdeUpdate = Math.floor(
        (agora.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const semanasDecaimento = Math.floor(diasDesdeUpdate / 7);

      const taxaDecaimento = lote.regra_decaimento || 0.0366;
      const pesoAtual = lote.peso_atual || lote.peso_inicial || 0;
      const pesoFinal = Number(
        (pesoAtual * Math.pow(1 - taxaDecaimento, semanasDecaimento)).toFixed(3)
      );

      // Impact calculations based on peso_inicial (Embrapa methodology)
      const pesoInicial = lote.peso_inicial || 0;
      const co2eqEvitado = Number((pesoInicial * 0.766).toFixed(3));
      const creditosCau = Number((pesoInicial / 1000).toFixed(4));

      // Get last chain hash
      const { data: lastHashResult } = await supabase.rpc(
        "get_last_chain_hash",
        { unit_code: unidadeCodigo }
      );
      const hashAnterior = lastHashResult || "genesis";

      // Get next chain index
      const { data: nextIndexResult } = await supabase.rpc(
        "get_next_chain_index"
      );
      const indiceCadeia = nextIndexResult || 1;

      // Generate integrity hash (MD5 via SQL since Deno doesn't have crypto-js)
      const hashData = [
        `codigo:${lote.codigo}`,
        `unidade:${lote.unidade}`,
        `data_inicio:${lote.data_inicio}`,
        `data_final:${agora.toISOString()}`,
        `peso_inicial:${pesoInicial}`,
        `peso_final:${pesoFinal}`,
        `lat:${lote.latitude || "null"}`,
        `lng:${lote.longitude || "null"}`,
        `criado_por:${lote.criado_por_nome}`,
        `hash_anterior:${hashAnterior}`,
        `tipo:finalizacao_administrativa`,
      ].join("|");

      // Use Deno's Web Crypto API for hash
      const encoder = new TextEncoder();
      const data = encoder.encode(hashData);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashIntegridade = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const justificativa = `Encerramento administrativo — ${motivo} Peso final estimado por taxa de decaimento composta (${(taxaDecaimento * 100).toFixed(2)}%/semana × ${semanasDecaimento} semanas sobre peso_atual=${pesoAtual.toFixed(3)} kg). Autorizado por ${adminNome}.`;

      const dadosEspecificos = {
        tipo_encerramento: "administrativo",
        motivo,
        peso_atual_conhecido: pesoAtual,
        peso_final_estimado: true,
        formula: `peso_atual × (1 - ${taxaDecaimento})^${semanasDecaimento}`,
        taxa_decaimento: taxaDecaimento,
        semanas_decaimento: semanasDecaimento,
        dias_sem_manejo: diasDesdeUpdate,
        data_ultimo_update: updatedAt.toISOString(),
        autorizado_por: adminNome,
        autorizado_por_id: userId,
        data_encerramento: agora.toISOString(),
      };

      // 1) Insert finalizacao_administrativa event (etapa 8)
      const { error: eventoError } = await supabase
        .from("lote_eventos")
        .insert({
          lote_id: lote.id,
          tipo_evento: "finalizacao_administrativa",
          etapa_numero: 8,
          data_evento: agora.toISOString(),
          peso_antes: pesoAtual,
          peso_depois: pesoFinal,
          caixa_origem: lote.caixa_atual,
          caixa_destino: lote.caixa_atual,
          administrador_id: userId,
          administrador_nome: adminNome,
          observacoes: justificativa,
          fotos_compartilhadas: [],
          dados_especificos: dadosEspecificos,
          latitude: lote.latitude,
          longitude: lote.longitude,
        });

      if (eventoError) {
        console.error(`Erro ao criar evento para lote ${lote.codigo}:`, eventoError);
        resultados.push({
          lote: lote.codigo_unico || lote.codigo,
          erro: eventoError.message,
        });
        continue;
      }

      // 2) Update lot to encerrado
      const { error: updateError } = await supabase
        .from("lotes")
        .update({
          status: "encerrado",
          peso_final: pesoFinal,
          co2eq_evitado: co2eqEvitado,
          creditos_cau: creditosCau,
          data_finalizacao: agora.toISOString(),
          data_encerramento: agora.toISOString(),
          hash_integridade: hashIntegridade,
          hash_anterior: hashAnterior,
          indice_cadeia: indiceCadeia,
          data_hash_criacao: agora.toISOString(),
        })
        .eq("id", lote.id);

      if (updateError) {
        console.error(`Erro ao atualizar lote ${lote.codigo}:`, updateError);
        resultados.push({
          lote: lote.codigo_unico || lote.codigo,
          erro: updateError.message,
        });
        continue;
      }

      // 3) Log activity
      await supabase.from("user_activity_logs").insert({
        user_id: userId,
        action_type: "encerramento_administrativo",
        action_description: `Encerramento administrativo do lote ${lote.codigo_unico || lote.codigo}. Peso final estimado: ${pesoFinal} kg. Motivo: ${motivo}`,
        table_affected: "lotes",
        record_id: lote.id,
      });

      resultados.push({
        lote: lote.codigo_unico || lote.codigo,
        caixa: lote.caixa_atual,
        peso_inicial: pesoInicial,
        peso_atual_ultimo: pesoAtual,
        peso_final_estimado: pesoFinal,
        dias_sem_manejo: diasDesdeUpdate,
        semanas_decaimento: semanasDecaimento,
        taxa_decaimento: taxaDecaimento,
        co2eq_evitado: co2eqEvitado,
        creditos_cau: creditosCau,
        hash_integridade: hashIntegridade,
        status: "encerrado",
      });
    }

    const totalPesoInicial = resultados
      .filter((r) => !r.erro)
      .reduce((acc, r) => acc + ((r.peso_inicial as number) || 0), 0);
    const totalPesoFinal = resultados
      .filter((r) => !r.erro)
      .reduce((acc, r) => acc + ((r.peso_final_estimado as number) || 0), 0);
    const totalCo2 = resultados
      .filter((r) => !r.erro)
      .reduce((acc, r) => acc + ((r.co2eq_evitado as number) || 0), 0);

    return new Response(
      JSON.stringify({
        sucesso: true,
        unidade: unidadeCodigo,
        total_lotes_encerrados: resultados.filter((r) => !r.erro).length,
        total_erros: resultados.filter((r) => r.erro).length,
        resumo: {
          peso_inicial_total: Number(totalPesoInicial.toFixed(3)),
          peso_final_total: Number(totalPesoFinal.toFixed(3)),
          co2eq_evitado_total: Number(totalCo2.toFixed(3)),
          creditos_cau_total: Number((totalPesoInicial / 1000).toFixed(4)),
        },
        detalhes: resultados,
        motivo,
        autorizado_por: adminNome,
        data_execucao: agora.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro no encerramento administrativo:", error);
    return new Response(
      JSON.stringify({
        error: "Erro interno no encerramento",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
