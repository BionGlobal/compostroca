import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReativacaoRequest {
  codigo_lote: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [reativar-lote-entregas] Iniciando reativação de lote...');

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

    const { codigo_lote } = await req.json() as ReativacaoRequest;
    
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
      data_encerramento: lote.data_encerramento,
      peso_inicial: lote.peso_inicial,
    });

    // 2. Validar se está em caixa_atual = 1
    if (lote.caixa_atual !== 1) {
      console.warn(`⚠️ Lote não está na Caixa 1 (caixa_atual = ${lote.caixa_atual})`);
      return new Response(
        JSON.stringify({ 
          error: 'Lote não está na Caixa 1 - não pode ser reativado para entregas',
          lote: {
            codigo: lote.codigo,
            caixa_atual: lote.caixa_atual,
            status: lote.status,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Verificar se já está ativo e sem encerramento
    if (lote.status === 'ativo' && !lote.data_encerramento) {
      console.log('✅ Lote já está ativo e sem data de encerramento - nenhuma correção necessária');
      return new Response(
        JSON.stringify({ 
          message: 'Lote já está ativo para entregas',
          lote: {
            codigo: lote.codigo,
            status: lote.status,
            caixa_atual: lote.caixa_atual,
            data_encerramento: lote.data_encerramento,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 4. Reativar lote para entregas
    console.log(`🔄 Reativando lote para entregas...`);
    console.log(`   Status: "${lote.status}" → "ativo"`);
    console.log(`   Data Encerramento: ${lote.data_encerramento || 'null'} → NULL`);
    
    const { data: loteReativado, error: updateError } = await supabaseAdmin
      .from('lotes')
      .update({ 
        status: 'ativo',
        data_encerramento: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lote.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao reativar lote:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao reativar lote', details: updateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Lote reativado com sucesso!');
    console.log('📊 Lote atualizado:', {
      codigo: loteReativado.codigo,
      status: loteReativado.status,
      caixa_atual: loteReativado.caixa_atual,
      data_encerramento: loteReativado.data_encerramento,
      peso_inicial: loteReativado.peso_inicial,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Lote ${codigo_lote} reativado para receber entregas`,
        lote_antes: {
          status: lote.status,
          data_encerramento: lote.data_encerramento,
        },
        lote_depois: {
          codigo: loteReativado.codigo,
          status: loteReativado.status,
          caixa_atual: loteReativado.caixa_atual,
          data_encerramento: loteReativado.data_encerramento,
          peso_inicial: loteReativado.peso_inicial,
          peso_atual: loteReativado.peso_atual,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro fatal na reativação de lote:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
