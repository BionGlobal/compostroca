-- Criar políticas RLS para tabela lote_fotos
-- Permitir que usuários aprovados visualizem fotos dos lotes de suas unidades autorizadas
CREATE POLICY "Approved users can view lote photos from authorized units" 
ON lote_fotos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM lotes l 
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
  )
);

-- Permitir que admins locais/super insiram fotos nos lotes de suas unidades
CREATE POLICY "Approved local/super admins can insert lote photos" 
ON lote_fotos 
FOR INSERT 
WITH CHECK (
  can_modify_data() AND 
  EXISTS (
    SELECT 1 
    FROM lotes l 
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
  )
);

-- Permitir que admins locais/super atualizem fotos dos lotes de suas unidades
CREATE POLICY "Approved local/super admins can update lote photos" 
ON lote_fotos 
FOR UPDATE 
USING (
  can_modify_data() AND 
  EXISTS (
    SELECT 1 
    FROM lotes l 
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
  )
);

-- Permitir que admins locais/super deletem fotos dos lotes de suas unidades
CREATE POLICY "Approved local/super admins can delete lote photos" 
ON lote_fotos 
FOR DELETE 
USING (
  can_modify_data() AND 
  EXISTS (
    SELECT 1 
    FROM lotes l 
    WHERE l.id = lote_fotos.lote_id 
    AND has_unit_access(l.unidade)
  )
);