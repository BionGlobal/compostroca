-- Create function to auto-generate missing integrity hashes for finalized lots
CREATE OR REPLACE FUNCTION public.generate_missing_hashes()
RETURNS TABLE(lote_id uuid, lote_codigo text, hash_generated text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lote_record RECORD;
  hash_data TEXT;
  generated_hash TEXT;
BEGIN
  -- Iterate through finalized lots without hash
  FOR lote_record IN 
    SELECT l.id, l.codigo, l.unidade, l.data_inicio, 
           COALESCE(l.data_finalizacao, l.data_encerramento, l.updated_at) as data_final,
           l.peso_inicial, COALESCE(l.peso_final, l.peso_inicial * 0.3) as peso_final,
           l.latitude, l.longitude, COALESCE(l.criado_por, l.id::text) as criado_por
    FROM lotes l
    WHERE l.status = 'encerrado' 
      AND l.hash_integridade IS NULL
    ORDER BY l.data_inicio
  LOOP
    -- Create deterministic hash data string
    hash_data := CONCAT(
      'codigo:', lote_record.codigo,
      '|unidade:', lote_record.unidade,
      '|data_inicio:', lote_record.data_inicio,
      '|data_final:', lote_record.data_final,
      '|peso_inicial:', lote_record.peso_inicial,
      '|peso_final:', lote_record.peso_final,
      '|lat:', COALESCE(lote_record.latitude::text, 'null'),
      '|lng:', COALESCE(lote_record.longitude::text, 'null'),
      '|criado_por:', lote_record.criado_por
    );
    
    -- Generate a simple hash (basic implementation)
    generated_hash := ENCODE(DIGEST(hash_data, 'sha256'), 'hex');
    
    -- Update the lot with the generated hash
    UPDATE lotes 
    SET hash_integridade = generated_hash,
        updated_at = now()
    WHERE id = lote_record.id;
    
    -- Return info for logging
    RETURN QUERY SELECT lote_record.id, lote_record.codigo, generated_hash;
  END LOOP;
END;
$$;