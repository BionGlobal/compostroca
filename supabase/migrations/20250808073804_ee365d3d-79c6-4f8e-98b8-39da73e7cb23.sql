-- Corrigir os dados do lote CWB001-07082025A658
-- Peso total correto: 107,135 kg (79,365 kg de resíduos orgânicos + 27,77 kg de cepilho)
UPDATE public.lotes 
SET 
  peso_inicial = 107.135,
  peso_atual = 107.135,
  updated_at = now()
WHERE codigo = 'CWB001-07082025A658';