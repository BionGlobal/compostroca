import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceRequest {
  unidade_codigo: string;
  data_sessao: string;
  administrador_id: string;
  administrador_nome: string;
  observacoes_gerais?: string;
  fotos_gerais?: string[];
  latitude?: number;
  longitude?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      unidade_codigo,
      data_sessao,
      administrador_id,
      administrador_nome,
      observacoes_gerais = '',
      fotos_gerais = [],
      latitude,
      longitude
    }: MaintenanceRequest = await req.json();

    console.log('🔄 Starting weekly maintenance for unit:', unidade_codigo);
    console.log('📅 Session date:', data_sessao);

    // 1. Create maintenance session
    const { data: sessao, error: sessaoError } = await supabase
      .from('sessoes_manutencao')
      .insert({
        unidade_codigo,
        data_sessao,
        administrador_id,
        administrador_nome,
        observacoes_gerais,
        fotos_gerais: fotos_gerais || [],
        latitude,
        longitude
      })
      .select()
      .single();

    if (sessaoError) {
      console.error('❌ Error creating session:', sessaoError);
      throw new Error(`Failed to create session: ${sessaoError.message}`);
    }

    console.log('✅ Session created:', sessao.id);

    // 2. Fetch active lots sorted by caixa (1..7)
    const { data: lotes, error: lotesError } = await supabase
      .from('lotes')
      .select('*')
      .eq('unidade', unidade_codigo)
      .in('status', ['ativo', 'em_processamento'])
      .is('deleted_at', null)
      .order('caixa_atual', { ascending: true });

    if (lotesError) {
      console.error('❌ Error fetching lots:', lotesError);
      throw new Error(`Failed to fetch lots: ${lotesError.message}`);
    }

    console.log(`📦 Found ${lotes.length} active lots`);

    // Safety check: abort if we're about to finalize everything
    if (lotes.length > 6) {
      console.error('⚠️ Safety abort: too many active lots detected');
      throw new Error('Safety check failed: unexpected lot count');
    }

    const loteCaixa7 = lotes.find(l => l.caixa_atual === 7);
    const lotesToMove = lotes.filter(l => l.caixa_atual < 7).sort((a, b) => b.caixa_atual - a.caixa_atual);

    const finalized = [];
    const moved = [];

    // 3. Finalize the lot in caixa 7 (if exists)
    if (loteCaixa7) {
      console.log(`🏁 Finalizing lot in box 7: ${loteCaixa7.codigo}`);

      const { error: finalizeError } = await supabase
        .from('lotes')
        .update({
          status: 'encerrado',
          peso_final: loteCaixa7.peso_atual,
          data_finalizacao: new Date().toISOString(),
          data_encerramento: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', loteCaixa7.id);

      if (finalizeError) {
        console.error('❌ Error finalizing lot:', finalizeError);
      } else {
        // Create finalization event
        await supabase.from('lote_eventos').insert({
          lote_id: loteCaixa7.id,
          tipo_evento: 'finalizacao',
          etapa_numero: 8,
          data_evento: new Date().toISOString(),
          peso_antes: loteCaixa7.peso_atual,
          peso_depois: loteCaixa7.peso_atual,
          caixa_origem: 7,
          caixa_destino: 7,
          latitude,
          longitude,
          administrador_id,
          administrador_nome,
          sessao_manutencao_id: sessao.id,
          observacoes: `Finalização - ${observacoes_gerais}`,
          dados_especificos: { peso_final: loteCaixa7.peso_atual }
        });

        finalized.push({
          codigo: loteCaixa7.codigo,
          peso_final: loteCaixa7.peso_atual
        });
        console.log(`✅ Finalized ${loteCaixa7.codigo}`);
      }
    }

    // 4. Move lots forward (6→7, 5→6, ..., 1→2)
    for (const lote of lotesToMove) {
      const caixa_origem = lote.caixa_atual;
      const caixa_destino = caixa_origem + 1;
      const semana_nova = caixa_destino;
      const taxa_decaimento = lote.regra_decaimento || 0.0365;
      
      // Apply weekly decay: 3,65% reduction = multiply by 0.9635
      const peso_antes = lote.peso_atual || lote.peso_inicial;
      const peso_depois = peso_antes * 0.9635;

      console.log(`➡️ Moving ${lote.codigo}: Box ${caixa_origem}→${caixa_destino}, Weight ${peso_antes.toFixed(2)}→${peso_depois.toFixed(2)}`);

      const { error: moveError } = await supabase
        .from('lotes')
        .update({
          caixa_atual: caixa_destino,
          semana_atual: semana_nova,
          peso_atual: parseFloat(peso_depois.toFixed(2)),
          status: 'em_processamento',
          updated_at: new Date().toISOString()
        })
        .eq('id', lote.id);

      if (moveError) {
        console.error(`❌ Error moving ${lote.codigo}:`, moveError);
      } else {
        // Create transfer event
        await supabase.from('lote_eventos').insert({
          lote_id: lote.id,
          tipo_evento: 'transferencia',
          etapa_numero: semana_nova,
          data_evento: new Date().toISOString(),
          peso_antes,
          peso_depois: parseFloat(peso_depois.toFixed(2)),
          caixa_origem,
          caixa_destino,
          latitude,
          longitude,
          administrador_id,
          administrador_nome,
          sessao_manutencao_id: sessao.id,
          observacoes: `Transferência semanal - ${observacoes_gerais}`,
          dados_especificos: {
            taxa_decaimento,
            reducao_peso: parseFloat((peso_antes - peso_depois).toFixed(2))
          }
        });

        moved.push({
          codigo: lote.codigo,
          from: caixa_origem,
          to: caixa_destino,
          peso_antes: parseFloat(peso_antes.toFixed(2)),
          peso_depois: parseFloat(peso_depois.toFixed(2))
        });
        console.log(`✅ Moved ${lote.codigo}`);
      }
    }

    console.log(`✅ Maintenance complete. Finalized: ${finalized.length}, Moved: ${moved.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessao_id: sessao.id,
        unidade: unidade_codigo,
        finalized,
        moved,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
