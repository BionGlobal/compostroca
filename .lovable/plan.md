

# Fix: Check Constraint on `lote_eventos.tipo_evento`

## Problem
The `lote_eventos_tipo_evento_check` constraint only allows: `inicio`, `manutencao`, `finalizacao`. The Edge Function uses `finalizacao_administrativa` which is rejected by the DB.

## Solution
Two changes needed:

### 1. Database Migration
Alter the check constraint to add `'finalizacao_administrativa'` and `'transferencia'` (already used by other functions):

```sql
ALTER TABLE lote_eventos DROP CONSTRAINT lote_eventos_tipo_evento_check;
ALTER TABLE lote_eventos ADD CONSTRAINT lote_eventos_tipo_evento_check 
  CHECK (tipo_evento = ANY (ARRAY['inicio', 'manutencao', 'finalizacao', 'finalizacao_administrativa', 'transferencia']));
```

### 2. No Edge Function changes needed
The function code is correct — it just needs the DB to accept the new event type.

After the migration, the user clicks the button again and the 7 lots should close successfully.

