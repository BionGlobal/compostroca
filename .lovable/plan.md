

# Deletar entrega acidental de Maurício Gikoski (7.000 kg)

## Entrega identificada
- **ID:** `362cbe08-c92c-44f6-86c5-78795c5c1c5d`
- **Voluntário:** Maurício Gikoski
- **Peso:** 7.000 kg
- **Data:** 19/03/2026 às 20:25
- **Lote:** CWB001-19032026A927 (peso atual: 74.567 kg)

## Ação
Soft-delete da entrega (setar `deleted_at = now()`). O trigger `trigger_recalc_peso_entregas` já existente no banco recalcula automaticamente o `peso_inicial` e `peso_atual` do lote, subtraindo os 7 kg + 35% cepilho.

Nenhuma alteração de código necessária — apenas uma operação de dados via SQL.

