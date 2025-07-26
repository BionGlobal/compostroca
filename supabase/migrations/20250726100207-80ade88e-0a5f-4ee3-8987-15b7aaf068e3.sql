-- Add qualidade_residuo field to entregas table
ALTER TABLE entregas ADD COLUMN qualidade_residuo INTEGER CHECK (qualidade_residuo >= 1 AND qualidade_residuo <= 3);