-- Corrigir coluna caixa_destino para permitir NULL (para finalização de lotes)
ALTER TABLE manejo_semanal ALTER COLUMN caixa_destino DROP NOT NULL;