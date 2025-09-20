import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Use built-in Web Crypto API for hashing
const generateSHA256 = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

interface LoteHashData {
  codigo: string;
  unidade: string;
  data_inicio: string;
  data_encerramento: string | null;
  peso_inicial: number;
  peso_final: number;
  latitude: number | null;
  longitude: number | null;
  criado_por: string;
  voluntarios: string[];
  entregas: string[];
  fotos: string[];
  hash_anterior?: string | null;
  indice_cadeia?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const generateChainedLoteHash = async (data: LoteHashData, previousHash: string | null = null): Promise<string> => {
  const hashData = {
    codigo: data.codigo,
    unidade: data.unidade,
    data_inicio: data.data_inicio,
    data_encerramento: data.data_encerramento,
    peso_inicial: Number(data.peso_inicial),
    peso_final: Number(data.peso_final),
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    criado_por: data.criado_por,
    voluntarios: data.voluntarios?.sort() || [],
    entregas: data.entregas?.sort() || [],
    fotos: data.fotos?.sort() || [],
    hash_anterior: previousHash || 'GENESIS',
    indice_cadeia: data.indice_cadeia || 0
  };

  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  return await generateSHA256(dataString);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Iniciando geração de hashes para lotes finalizados...');

    // Buscar todos os lotes finalizados sem hash, ordenados por índice de cadeia
    const { data: lotes, error: lotesError } = await supabase
      .from('lotes')
      .select(`
        id, codigo, unidade, data_inicio, data_encerramento, peso_inicial, peso_final,
        latitude, longitude, criado_por, indice_cadeia, hash_integridade
      `)
      .eq('status', 'encerrado')
      .is('hash_integridade', null)
      .order('indice_cadeia');

    if (lotesError) {
      console.error('Erro ao buscar lotes:', lotesError);
      throw lotesError;
    }

    console.log(`Encontrados ${lotes?.length || 0} lotes para processar`);

    let previousHash: string | null = null;
    let processedCount = 0;

    for (const lote of lotes || []) {
      try {
        console.log(`Processando lote ${lote.codigo}...`);

        // Buscar voluntários únicos do lote
        const { data: entregas } = await supabase
          .from('entregas')
          .select('voluntario_id')
          .eq('lote_id', lote.id);

        const voluntarios = [...new Set(entregas?.map(e => e.voluntario_id) || [])];

        // Buscar IDs das entregas
        const entregasIds = entregas?.map(e => e.id) || [];

        // Buscar fotos do lote
        const { data: fotos } = await supabase
          .from('lote_fotos')
          .select('id')
          .eq('lote_id', lote.id)
          .is('deleted_at', null);

        const fotosIds = fotos?.map(f => f.id) || [];

        // Preparar dados para hash
        const hashData: LoteHashData = {
          codigo: lote.codigo,
          unidade: lote.unidade,
          data_inicio: lote.data_inicio,
          data_encerramento: lote.data_encerramento,
          peso_inicial: lote.peso_inicial || 0,
          peso_final: lote.peso_final || 0,
          latitude: lote.latitude,
          longitude: lote.longitude,
          criado_por: lote.criado_por,
          voluntarios: voluntarios.map(v => v.toString()),
          entregas: entregasIds.map(e => e.toString()),
          fotos: fotosIds.map(f => f.toString()),
          hash_anterior: previousHash,
          indice_cadeia: lote.indice_cadeia
        };

        // Gerar hash
        const novoHash = await generateChainedLoteHash(hashData, previousHash);

        // Atualizar lote com o hash
        const { error: updateError } = await supabase
          .from('lotes')
          .update({ 
            hash_integridade: novoHash,
            hash_anterior: previousHash 
          })
          .eq('id', lote.id);

        if (updateError) {
          console.error(`Erro ao atualizar lote ${lote.codigo}:`, updateError);
          throw updateError;
        }

        previousHash = novoHash;
        processedCount++;
        console.log(`Hash gerado para lote ${lote.codigo}: ${novoHash.substring(0, 16)}...`);

      } catch (error) {
        console.error(`Erro ao processar lote ${lote.codigo}:`, error);
        throw error;
      }
    }

    console.log(`Processamento concluído. ${processedCount} hashes gerados.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Hashes gerados para ${processedCount} lotes finalizados`,
        processedCount 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
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