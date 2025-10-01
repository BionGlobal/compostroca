-- Atualizar a função de cálculo de peso com decaimento para usar a taxa correta de 3,54%
DROP FUNCTION IF EXISTS public.calcular_peso_com_decaimento(numeric, numeric);

CREATE OR REPLACE FUNCTION public.calcular_peso_com_decaimento(peso_anterior numeric, taxa_decaimento numeric DEFAULT 0.0354)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT ROUND(peso_anterior * (1 - taxa_decaimento), 2);
$function$;

-- Atualizar a coluna regra_decaimento em todos os lotes existentes
UPDATE public.lotes 
SET regra_decaimento = 0.0354,
    updated_at = now()
WHERE regra_decaimento = 0.0366;

-- Comentário explicativo
COMMENT ON FUNCTION public.calcular_peso_com_decaimento IS 'Calcula o peso após decaimento semanal. Taxa padrão: 3,54% (0.0354) por semana';