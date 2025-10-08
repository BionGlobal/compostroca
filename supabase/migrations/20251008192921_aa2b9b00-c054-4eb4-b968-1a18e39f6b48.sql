
-- Função para corrigir evento de finalização do lote CWB001-21082025A344
-- Associa o evento à sessão de manutenção mais recente (08/10/2025 18:32)

DO $$
DECLARE
  v_lote_id uuid;
  v_sessao_id uuid := 'd2d8c686-5e87-4fbf-bbdc-c2c8aa07d940';
  v_evento_id uuid;
BEGIN
  -- Buscar ID do lote
  SELECT id INTO v_lote_id
  FROM lotes
  WHERE codigo = 'CWB001-21082025A344';

  -- Atualizar evento de finalização (Etapa 8) com a sessão correta
  UPDATE lote_eventos
  SET 
    sessao_manutencao_id = v_sessao_id,
    fotos_compartilhadas = jsonb_build_array(
      'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759948330934-0.jpg',
      'https://yfcxdbhrtjdmwyifgptf.supabase.co/storage/v1/object/public/manejo-fotos/04c8f530-e3c1-4f52-abf9-d12448c9759b/manejo-1759948331658-1.jpg'
    ),
    data_evento = '2025-10-08 18:32:13+00'::timestamp with time zone,
    administrador_nome = 'Maurício Neves Gikoski',
    observacoes = 'Manejo das composteiras'
  WHERE lote_id = v_lote_id
    AND etapa_numero = 8
    AND tipo_evento = 'finalizacao'
  RETURNING id INTO v_evento_id;

  -- Atualizar data de finalização do lote
  UPDATE lotes
  SET 
    data_finalizacao = '2025-10-08 18:32:13+00'::timestamp with time zone,
    updated_at = now()
  WHERE id = v_lote_id;

  RAISE NOTICE 'Evento % atualizado com fotos da sessão %', v_evento_id, v_sessao_id;
END $$;
