ALTER TABLE lote_eventos DROP CONSTRAINT lote_eventos_tipo_evento_check;
ALTER TABLE lote_eventos ADD CONSTRAINT lote_eventos_tipo_evento_check 
  CHECK (tipo_evento = ANY (ARRAY['inicio', 'manutencao', 'finalizacao', 'finalizacao_administrativa', 'transferencia']));