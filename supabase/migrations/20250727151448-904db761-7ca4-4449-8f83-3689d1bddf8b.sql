-- Adicionar campo hash_integridade na tabela lotes
ALTER TABLE public.lotes 
ADD COLUMN hash_integridade TEXT;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_lotes_hash_integridade ON public.lotes(hash_integridade);

-- Comentário da coluna
COMMENT ON COLUMN public.lotes.hash_integridade IS 'Hash SHA256 para garantir integridade dos dados do lote (blockchain-like)';