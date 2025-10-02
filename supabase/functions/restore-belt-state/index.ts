import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestoreMapping {
  [lote_codigo: string]: number; // lote_codigo → target_caixa
}

interface RestoreRequest {
  unidade_codigo: string;
  mapping: RestoreMapping;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { unidade_codigo, mapping }: RestoreRequest = await req.json();

    console.log('🔧 Starting belt state restoration for unit:', unidade_codigo);
    console.log('📋 Mapping:', mapping);

    const restored = [];
    const errors = [];

    for (const [lote_codigo, target_caixa] of Object.entries(mapping)) {
      try {
        // Fetch the lote to get peso_inicial and regra_decaimento
        const { data: lote, error: fetchError } = await supabase
          .from('lotes')
          .select('id, codigo, peso_inicial, regra_decaimento')
          .eq('codigo', lote_codigo)
          .eq('unidade', unidade_codigo)
          .is('deleted_at', null)
          .single();

        if (fetchError || !lote) {
          console.error(`❌ Lote ${lote_codigo} not found:`, fetchError);
          errors.push({ lote_codigo, error: 'Lote not found' });
          continue;
        }

        const peso_inicial = lote.peso_inicial || 0;
        const taxa_decaimento = lote.regra_decaimento || 0.0366;
        const semana_atual = target_caixa;

        // Calculate peso_atual: peso_inicial × (1 - taxa)^(semana - 1)
        const peso_atual = semana_atual === 1 
          ? peso_inicial 
          : peso_inicial * Math.pow(1 - taxa_decaimento, semana_atual - 1);

        console.log(`📦 Restoring ${lote_codigo}:`, {
          target_caixa,
          semana_atual,
          peso_inicial,
          peso_atual: peso_atual.toFixed(2),
          taxa_decaimento
        });

        // Update the lote
        const { error: updateError } = await supabase
          .from('lotes')
          .update({
            status: 'em_processamento',
            caixa_atual: target_caixa,
            semana_atual: semana_atual,
            peso_atual: parseFloat(peso_atual.toFixed(2)),
            data_encerramento: null,
            data_finalizacao: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', lote.id);

        if (updateError) {
          console.error(`❌ Error updating ${lote_codigo}:`, updateError);
          errors.push({ lote_codigo, error: updateError.message });
        } else {
          console.log(`✅ Successfully restored ${lote_codigo}`);
          restored.push({
            lote_codigo,
            caixa: target_caixa,
            semana: semana_atual,
            peso_atual: parseFloat(peso_atual.toFixed(2))
          });
        }
      } catch (err) {
        console.error(`❌ Exception processing ${lote_codigo}:`, err);
        errors.push({ lote_codigo, error: String(err) });
      }
    }

    console.log(`✅ Restoration complete. Restored: ${restored.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        unidade: unidade_codigo,
        restored,
        errors,
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
