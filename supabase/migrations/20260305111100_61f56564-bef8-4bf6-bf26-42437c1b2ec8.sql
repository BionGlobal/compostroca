
DROP INDEX IF EXISTS unica_caixa1;
CREATE UNIQUE INDEX unica_caixa1 ON public.lotes USING btree (unidade, caixa_atual) 
  WHERE (caixa_atual = 1 AND status IN ('ativo', 'em_processamento') AND deleted_at IS NULL);
