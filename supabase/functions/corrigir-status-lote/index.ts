import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CorrecaoRequest {
  codigo_lote: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 [corrigir-status-lote] Iniciando correção de status...');

    // Criar cliente Supabase com service_role_key (permissões completas)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { codigo_lote } = await req.json() as CorrecaoRequest;
    
    if (!codigo_lote) {
      console.error('❌ Código do lote não fornecido');
      return new Response(
        JSON.stringify({ error: 'Código do lote é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Buscando lote: ${codigo_lote}`);

    // 1. Buscar o lote
    const { data: lote, error: fetchError } = await supabaseAdmin
      .from('lotes')
      .select('*')
      .eq('codigo', codigo_lote)
      .is('deleted_at', null)
      .single();

    if (fetchError || !lote) {
      console.error(`❌ Lote não encontrado: ${codigo_lote}`, fetchError);
      return new Response(
        JSON.stringify({ error: 'Lote não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`📦 Lote encontrado:`, {
      codigo: lote.codigo,
      status_atual: lote.status,
      caixa_atual: lote.caixa_atual,
      peso_inicial: lote.peso_inicial,
    });

    // 2. Validar se está em caixa_atual = 1
    if (lote.caixa_atual !== 1) {
      console.warn(`⚠️ Lote não está na Caixa 1 (caixa_atual = ${lote.caixa_atual})`);
      return new Response(
        JSON.stringify({ 
          error: 'Lote não está na Caixa 1',
          lote: {
            codigo: lote.codigo,
            caixa_atual: lote.caixa_atual,
            status: lote.status,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Verificar se precisa de correção
    if (lote.status === 'ativo') {
      console.log('✅ Lote já está com status "ativo" - nenhuma correção necessária');
      return new Response(
        JSON.stringify({ 
          message: 'Lote já está com status correto',
          lote: {
            codigo: lote.codigo,
            status: lote.status,
            caixa_atual: lote.caixa_atual,
            peso_inicial: lote.peso_inicial,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 4. Corrigir status para "ativo"
    console.log(`🔄 Corrigindo status de "${lote.status}" para "ativo"...`);
    
    const { data: loteCorrigido, error: updateError } = await supabaseAdmin
      .from('lotes')
      .update({ 
        status: 'ativo',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lote.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status do lote', details: updateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Status corrigido com sucesso!');
    console.log('📊 Lote atualizado:', {
      codigo: loteCorrigido.codigo,
      status: loteCorrigido.status,
      caixa_atual: loteCorrigido.caixa_atual,
      peso_inicial: loteCorrigido.peso_inicial,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Status do lote ${codigo_lote} corrigido para "ativo"`,
        lote_antes: {
          status: lote.status,
        },
        lote_depois: {
          codigo: loteCorrigido.codigo,
          status: loteCorrigido.status,
          caixa_atual: loteCorrigido.caixa_atual,
          peso_inicial: loteCorrigido.peso_inicial,
          peso_atual: loteCorrigido.peso_atual,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro fatal na correção de status:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
