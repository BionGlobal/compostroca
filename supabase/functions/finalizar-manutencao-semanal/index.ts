import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoteAtivo {
  id: string
  codigo: string
  caixa_atual: number
  semana_atual: number
  peso_atual: number
  regra_decaimento: number
  status: string
  unidade: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { 
      unidade_codigo, 
      data_sessao, 
      administrador_id, 
      administrador_nome,
      observacoes_gerais,
      fotos_gerais,
      latitude,
      longitude
    } = await req.json()

    console.log('[INICIO] Finalizando manutenção semanal:', {
      unidade: unidade_codigo,
      data_sessao,
      admin: administrador_nome
    })

    // 1. Buscar lotes ativos ordenados por caixa
    const { data: lotesAtivos, error: fetchError } = await supabase
      .from('lotes')
      .select('*')
      .eq('unidade', unidade_codigo)
      .in('status', ['ativo', 'em_processamento'])
      .order('caixa_atual', { ascending: true })

    if (fetchError) {
      console.error('[ERRO] Erro ao buscar lotes:', fetchError)
      throw fetchError
    }

    console.log(`[INFO] ${lotesAtivos?.length || 0} lotes ativos encontrados`)

    // 2. Criar sessão de manutenção
    const { data: sessao, error: sessaoError } = await supabase
      .from('sessoes_manutencao')
      .insert({
        unidade_codigo,
        data_sessao: data_sessao || new Date().toISOString(),
        administrador_id,
        administrador_nome,
        observacoes_gerais: observacoes_gerais || 'Manutenção semanal automatizada',
        fotos_gerais: fotos_gerais || [],
        latitude,
        longitude
      })
      .select()
      .single()

    if (sessaoError) {
      console.error('[ERRO] Erro ao criar sessão:', sessaoError)
      throw sessaoError
    }

    console.log('[INFO] Sessão de manutenção criada:', sessao.id)

    const movimentacoes: any[] = []
    const eventos: any[] = []

    // 3. Processar lotes da caixa 7 para 1 (ordem reversa para evitar conflitos)
    for (let i = (lotesAtivos?.length || 0) - 1; i >= 0; i--) {
      const lote = lotesAtivos![i] as LoteAtivo
      const taxaDecaimento = lote.regra_decaimento || 0.0354
      const pesoAntes = lote.peso_atual
      const pesoDepois = parseFloat((pesoAntes * (1 - taxaDecaimento)).toFixed(2))

      console.log(`[LOTE] Processando ${lote.codigo} - Caixa ${lote.caixa_atual}`)

      if (lote.caixa_atual === 7) {
        // Lote na caixa 7: finalizar
        const { error: updateError } = await supabase
          .from('lotes')
          .update({
            status: 'encerrado',
            peso_final: pesoDepois,
            peso_atual: pesoDepois,
            semana_atual: 7,
            data_finalizacao: new Date().toISOString(),
            data_encerramento: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', lote.id)

        if (updateError) {
          console.error(`[ERRO] Falha ao finalizar lote ${lote.codigo}:`, updateError)
          throw updateError
        }

        // Criar evento de finalização
        eventos.push({
          lote_id: lote.id,
          tipo_evento: 'finalizacao',
          etapa_numero: 8,
          data_evento: data_sessao || new Date().toISOString(),
          peso_antes: pesoAntes,
          peso_depois: pesoDepois,
          caixa_origem: 7,
          caixa_destino: 7,
          administrador_id,
          administrador_nome,
          latitude,
          longitude,
          sessao_manutencao_id: sessao.id,
          observacoes: `Lote finalizado - Semana 7 - Peso final: ${pesoDepois}kg`,
          dados_especificos: {
            reducao_peso: pesoAntes - pesoDepois,
            taxa_decaimento: taxaDecaimento
          }
        })

        movimentacoes.push({
          lote: lote.codigo,
          movimento: 'Caixa 7 → Finalizado',
          peso_antes: pesoAntes,
          peso_depois: pesoDepois
        })

        console.log(`[SUCESSO] Lote ${lote.codigo} finalizado - Peso: ${pesoAntes}kg → ${pesoDepois}kg`)

      } else {
        // Lote em caixas 1-6: mover para próxima caixa
        const novaCaixa = lote.caixa_atual + 1
        const novaSemana = lote.semana_atual + 1

        const { error: updateError } = await supabase
          .from('lotes')
          .update({
            caixa_atual: novaCaixa,
            semana_atual: novaSemana,
            peso_atual: pesoDepois,
            updated_at: new Date().toISOString()
          })
          .eq('id', lote.id)

        if (updateError) {
          console.error(`[ERRO] Falha ao mover lote ${lote.codigo}:`, updateError)
          throw updateError
        }

        // Criar evento de manutenção/transferência
        eventos.push({
          lote_id: lote.id,
          tipo_evento: 'manutencao',
          etapa_numero: novaSemana,
          data_evento: data_sessao || new Date().toISOString(),
          peso_antes: pesoAntes,
          peso_depois: pesoDepois,
          caixa_origem: lote.caixa_atual,
          caixa_destino: novaCaixa,
          administrador_id,
          administrador_nome,
          latitude,
          longitude,
          sessao_manutencao_id: sessao.id,
          observacoes: `Transferência Caixa ${lote.caixa_atual} → ${novaCaixa} - Semana ${novaSemana}`,
          dados_especificos: {
            reducao_peso: pesoAntes - pesoDepois,
            taxa_decaimento: taxaDecaimento
          }
        })

        movimentacoes.push({
          lote: lote.codigo,
          movimento: `Caixa ${lote.caixa_atual} → ${novaCaixa}`,
          peso_antes: pesoAntes,
          peso_depois: pesoDepois
        })

        console.log(`[SUCESSO] Lote ${lote.codigo} movido ${lote.caixa_atual}→${novaCaixa} - Peso: ${pesoAntes}kg → ${pesoDepois}kg`)
      }
    }

    // 4. Inserir todos os eventos
    if (eventos.length > 0) {
      const { error: eventosError } = await supabase
        .from('lote_eventos')
        .insert(eventos)

      if (eventosError) {
        console.error('[ERRO] Erro ao criar eventos:', eventosError)
        throw eventosError
      }

      console.log(`[INFO] ${eventos.length} eventos criados`)
    }

    console.log('[SUCESSO] Manutenção semanal finalizada com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        sessao_id: sessao.id,
        movimentacoes,
        total_lotes_processados: lotesAtivos?.length || 0,
        message: 'Manutenção semanal finalizada com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[ERRO FATAL]', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
