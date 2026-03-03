

# Plan: Administrative Closure - Certificate Handling

## Current State

The certificate page (`/lote/auditoria/:codigoUnico`) uses `lote_eventos` as its sole data source for the timeline. Only events that physically exist in that table are rendered. There is no synthetic gap-filling in the public audit hook (`usePublicLoteAuditoria`).

## What Happens to Certificates After Administrative Closure

For the 7 lots being closed, the Edge Function `encerrar-lotes-ferias` will insert a single `finalizacao_administrativa` event at **etapa_numero = 8**. The resulting certificates will show:

```text
Timeline for an administratively-closed lot (e.g. lot at caixa 4):
  ┌─ Semana 0: Entrega (real data, real photos, real validator)
  ├─ Semana 1: Manutencao (real, if event exists)
  ├─ Semana 2: Manutencao (real, if event exists)  
  ├─ Semana 3: Manutencao (real, if event exists)
  │  (semanas 4-6 absent — no events recorded)
  └─ Semana 7: Finalização Administrativa (new event)
```

This is honest — it shows exactly what happened. No fabricated data.

## Recommended Enhancement

Add a visible **administrative notice** on the certificate for lots closed this way, so anyone auditing understands the context. This requires:

### 1. Edge Function `encerrar-lotes-ferias` (already planned)

When inserting the etapa 8 event, include in `dados_especificos`:
```json
{
  "tipo_encerramento": "administrativo",
  "motivo": "Recesso operacional Dez/2025-Fev/2026",
  "peso_final_estimado": true,
  "formula": "peso_atual × (1 - 0.0366)^semanas",
  "semanas_decaimento": 13,
  "dias_sem_manejo": 96
}
```

And set `observacoes` to the full justification string.

### 2. Update `usePublicLoteAuditoria` (minor)

Detect if the etapa 8 event has `tipo_evento = 'finalizacao_administrativa'` and pass a flag to the UI so it can show a distinct badge ("Encerramento Administrativo" instead of "Lote Certificado").

### 3. Update `TraceabilityTimeline` (minor)

For the finalization event, if `nota_contexto` contains the administrative justification, render it with a distinct yellow/warning style border to differentiate from a normal finalization.

### 4. Update `LoteHeader` (minor)

If `statusLote` is `certificado` but the lot was administratively closed, show an additional badge: `"Encerrado Administrativamente"` with a tooltip explaining the recess.

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/encerrar-lotes-ferias/index.ts` | Create |
| `supabase/config.toml` | Add `[functions.encerrar-lotes-ferias]` |
| `src/hooks/usePublicLoteAuditoria.ts` | Minor — detect administrative closure, pass flag |
| `src/components/auditoria/LoteHeader.tsx` | Minor — show administrative badge when applicable |
| `src/components/auditoria/TraceabilityTimeline.tsx` | Minor — style admin finalization event distinctly |

No SQL migration needed — all fields already exist (`tipo_evento` is free text, `dados_especificos` is JSONB, `observacoes` is text).

