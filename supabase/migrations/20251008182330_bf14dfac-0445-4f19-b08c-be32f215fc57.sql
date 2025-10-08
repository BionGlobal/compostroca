-- Função de recuperação para reprocessar sessões de manutenção existentes
-- Esta função cria lote_eventos e replica fotos para sessões já criadas
CREATE OR REPLACE FUNCTION public.reprocessar_sessao_manutencao(p_sessao_id uuid)
RETURNS TABLE(
  eventos_criados integer,
  fotos_replicadas integer,
  lotes_processados integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessao RECORD;
  v_lote RECORD;
  v_eventos_criados integer := 0;
  v_fotos_replicadas integer := 0;
  v_lotes_processados integer := 0;
  v_proxima_etapa integer;
BEGIN
  -- Buscar dados da sessão
  SELECT * INTO v_sessao
  FROM sessoes_manutencao
  WHERE id = p_sessao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão % não encontrada', p_sessao_id;
  END IF;

  RAISE NOTICE '🔄 Reprocessando sessão % de %', p_sessao_id, v_sessao.data_sessao;

  -- Buscar lotes ativos na data da sessão
  FOR v_lote IN 
    SELECT * FROM get_lotes_ativos_na_data(v_sessao.data_sessao)
  LOOP
    v_lotes_processados := v_lotes_processados + 1;

    -- Verificar se já existe evento para este lote nesta sessão
    IF NOT EXISTS (
      SELECT 1 FROM lote_eventos 
      WHERE lote_id = v_lote.lote_id 
      AND sessao_manutencao_id = p_sessao_id
    ) THEN
      -- Calcular próxima etapa
      SELECT COALESCE(MAX(etapa_numero), 1) + 1 INTO v_proxima_etapa
      FROM lote_eventos
      WHERE lote_id = v_lote.lote_id;

      -- Criar evento se não ultrapassar etapa 8
      IF v_proxima_etapa <= 8 THEN
        -- Determinar tipo de evento (finalizacao ou transferencia)
        IF v_lote.caixa_atual = 7 THEN
          -- Evento de finalização
          INSERT INTO lote_eventos (
            lote_id,
            tipo_evento,
            etapa_numero,
            data_evento,
            sessao_manutencao_id,
            peso_antes,
            peso_depois,
            caixa_origem,
            caixa_destino,
            administrador_id,
            administrador_nome,
            observacoes,
            fotos_compartilhadas,
            latitude,
            longitude
          ) VALUES (
            v_lote.lote_id,
            'finalizacao',
            8,
            v_sessao.data_sessao,
            p_sessao_id,
            v_lote.peso_atual,
            v_lote.peso_atual,
            7, 7,
            v_sessao.administrador_id,
            v_sessao.administrador_nome,
            'Finalização - ' || COALESCE(v_sessao.observacoes_gerais, ''),
            v_sessao.fotos_gerais,
            v_sessao.latitude,
            v_sessao.longitude
          );
        ELSE
          -- Evento de transferência
          INSERT INTO lote_eventos (
            lote_id,
            tipo_evento,
            etapa_numero,
            data_evento,
            sessao_manutencao_id,
            peso_antes,
            peso_depois,
            caixa_origem,
            caixa_destino,
            administrador_id,
            administrador_nome,
            observacoes,
            fotos_compartilhadas,
            latitude,
            longitude
          ) VALUES (
            v_lote.lote_id,
            'transferencia',
            v_proxima_etapa,
            v_sessao.data_sessao,
            p_sessao_id,
            v_lote.peso_atual,
            v_lote.peso_atual * 0.9635,
            v_lote.caixa_atual,
            v_lote.caixa_atual + 1,
            v_sessao.administrador_id,
            v_sessao.administrador_nome,
            'Transferência semanal - ' || COALESCE(v_sessao.observacoes_gerais, ''),
            v_sessao.fotos_gerais,
            v_sessao.latitude,
            v_sessao.longitude
          );
        END IF;

        v_eventos_criados := v_eventos_criados + 1;
        RAISE NOTICE '✅ Evento criado para lote %', v_lote.codigo;
      END IF;
    END IF;

    -- Replicar fotos da sessão para lote_fotos (se ainda não existirem)
    IF v_sessao.fotos_gerais IS NOT NULL AND jsonb_array_length(v_sessao.fotos_gerais) > 0 THEN
      DECLARE
        v_foto_url text;
      BEGIN
        FOR v_foto_url IN 
          SELECT jsonb_array_elements_text(v_sessao.fotos_gerais)
        LOOP
          -- Inserir apenas se não existir
          IF NOT EXISTS (
            SELECT 1 FROM lote_fotos 
            WHERE lote_id = v_lote.lote_id 
            AND foto_url = v_foto_url
            AND tipo_foto = 'manejo_semanal'
          ) THEN
            INSERT INTO lote_fotos (
              lote_id,
              foto_url,
              tipo_foto,
              created_at
            ) VALUES (
              v_lote.lote_id,
              v_foto_url,
              'manejo_semanal',
              v_sessao.data_sessao
            );
            v_fotos_replicadas := v_fotos_replicadas + 1;
          END IF;
        END LOOP;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Sessão reprocessada: % eventos, % fotos, % lotes', 
    v_eventos_criados, v_fotos_replicadas, v_lotes_processados;

  RETURN QUERY SELECT v_eventos_criados, v_fotos_replicadas, v_lotes_processados;
END;
$$;

COMMENT ON FUNCTION public.reprocessar_sessao_manutencao IS 
'Reprocessa uma sessão de manutenção existente, criando lote_eventos e replicando fotos para lotes ativos na data da sessão';