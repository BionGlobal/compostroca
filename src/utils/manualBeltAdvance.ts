import { supabase } from '@/integrations/supabase/client';

export async function executeManualBeltAdvance() {
  try {
    console.log('[MANUAL] Iniciando avanço manual da esteira...');
    
    const { data, error } = await supabase.functions.invoke('finalizar-manutencao-semanal', {
      body: {
        unidade_codigo: 'CWB001',
        data_sessao: '2025-10-01T12:00:00.000Z',
        administrador_id: '6c8b9239-eb82-4d86-a4db-11bbbf751f62',
        administrador_nome: 'Bion Global',
        observacoes_gerais: 'Correção manual da esteira - Avanço de 01/10/2025',
        fotos_gerais: [],
        latitude: -25.4404,
        longitude: -49.2232
      }
    });

    if (error) {
      console.error('[MANUAL] Erro ao executar:', error);
      throw error;
    }

    console.log('[MANUAL] Sucesso:', data);
    return data;
  } catch (err) {
    console.error('[MANUAL] Falha na execução:', err);
    throw err;
  }
}

// Auto-execute
executeManualBeltAdvance()
  .then(result => {
    console.log('[MANUAL] Resultado final:', result);
    alert('Esteira avançada com sucesso! Atualize a página para ver as mudanças.');
  })
  .catch(err => {
    console.error('[MANUAL] Erro fatal:', err);
    alert('Erro ao avançar esteira: ' + err.message);
  });
