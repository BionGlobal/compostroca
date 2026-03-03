

# Fix: Certificate Access for Admin-Closed Lots

## Problems Found

### 1. Missing `codigo_unico` in history data flow
The `useHistoricoLotes` hook fetches lots with `select('*')` (which includes `codigo_unico`), but the `LoteHistorico` interface and the object mapping omit `codigo_unico`. When `CardHistoricoLote` renders the "Ver Detalhes" link, it falls back to `lote.codigo` (e.g. `CWB001-27112025A450`), but the certificate page expects `codigo_unico` (e.g. `CWB001-27112025A001`).

### 2. No code issues with the certificate page itself
The `usePublicLoteAuditoria` hook correctly handles `finalizacao_administrativa` events (maps etapa 8 to `FINALIZACAO` type). The route `/lote/auditoria/:codigoUnico` exists. The query filters `status IN ('em_processamento', 'encerrado')` which matches.

## Fix

### File: `src/hooks/useHistoricoLotes.ts`
- Add `codigo_unico?: string` to the `LoteHistorico` interface
- Add `codigo_unico: lote.codigo_unico` in both processed data objects (novosLotesProcessados and lotesProntosProcessados)

### File: `src/components/CardHistoricoLote.tsx`
- Already has `codigo_unico?: string` in `LoteData` interface -- no change needed
- Already uses `lote.codigo_unico || lote.codigo` in the link -- no change needed

This single fix in the hook will make all 23 finalized lots (including the 7 admin-closed) accessible via the certificate page.

