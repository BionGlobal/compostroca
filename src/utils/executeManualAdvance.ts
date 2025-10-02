import { supabase } from '@/integrations/supabase/client';

// Execute imediatamente ao carregar
(async () => {
  console.log('[MANUAL ADVANCE] Iniciando execução...');
  
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
    console.error('[MANUAL ADVANCE] Erro:', error);
    alert(`❌ Erro ao avançar esteira: ${error.message}`);
  } else {
    console.log('[MANUAL ADVANCE] Sucesso:', data);
    alert('✅ Esteira avançada! Recarregue a página (F5) para ver as mudanças.');
    window.location.reload();
  }
})();

export {};
