-- Fase 1: Corrigir precisão do campo peso em entregas
-- Alterar de numeric(6,2) para numeric(7,3) para suportar 3 casas decimais

ALTER TABLE entregas 
ALTER COLUMN peso TYPE numeric(7, 3);

COMMENT ON COLUMN entregas.peso IS 'Peso da entrega em kg com precisão de 3 casas decimais (ex: 10.123 kg)';

-- Verificar e corrigir campos relacionados em outras tabelas

-- Lotes
ALTER TABLE lotes 
ALTER COLUMN peso_inicial TYPE numeric(10, 3);

ALTER TABLE lotes 
ALTER COLUMN peso_atual TYPE numeric(10, 3);

ALTER TABLE lotes 
ALTER COLUMN peso_final TYPE numeric(10, 3);

COMMENT ON COLUMN lotes.peso_inicial IS 'Peso inicial do lote em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lotes.peso_atual IS 'Peso atual do lote em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lotes.peso_final IS 'Peso final do lote em kg com precisão de 3 casas decimais';

-- Manejo Semanal
ALTER TABLE manejo_semanal 
ALTER COLUMN peso_antes TYPE numeric(10, 3);

ALTER TABLE manejo_semanal 
ALTER COLUMN peso_depois TYPE numeric(10, 3);

COMMENT ON COLUMN manejo_semanal.peso_antes IS 'Peso antes do manejo em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN manejo_semanal.peso_depois IS 'Peso depois do manejo em kg com precisão de 3 casas decimais';

-- Lote Eventos
ALTER TABLE lote_eventos 
ALTER COLUMN peso_antes TYPE numeric(10, 3);

ALTER TABLE lote_eventos 
ALTER COLUMN peso_depois TYPE numeric(10, 3);

ALTER TABLE lote_eventos 
ALTER COLUMN peso_medido TYPE numeric(10, 3);

ALTER TABLE lote_eventos 
ALTER COLUMN peso_estimado TYPE numeric(10, 3);

COMMENT ON COLUMN lote_eventos.peso_antes IS 'Peso antes do evento em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lote_eventos.peso_depois IS 'Peso depois do evento em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lote_eventos.peso_medido IS 'Peso medido em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lote_eventos.peso_estimado IS 'Peso estimado em kg com precisão de 3 casas decimais';

-- Lotes Manutenções
ALTER TABLE lotes_manutencoes 
ALTER COLUMN peso_antes TYPE numeric(10, 3);

ALTER TABLE lotes_manutencoes 
ALTER COLUMN peso_depois TYPE numeric(10, 3);

COMMENT ON COLUMN lotes_manutencoes.peso_antes IS 'Peso antes da manutenção em kg com precisão de 3 casas decimais';
COMMENT ON COLUMN lotes_manutencoes.peso_depois IS 'Peso depois da manutenção em kg com precisão de 3 casas decimais';