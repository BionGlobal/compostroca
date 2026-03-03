

# Fix: Edge Function Auth Error

## Problem
The `encerrar-lotes-ferias` function uses `supabaseAuth.auth.getClaims(token)` which doesn't exist in the Supabase JS client. Error: `getClaims is not a function`.

## Fix
Replace the `getClaims` call with `supabaseAuth.auth.getUser()` which returns the authenticated user from the JWT token passed in the Authorization header. The user ID comes from `data.user.id`.

## File
`supabase/functions/encerrar-lotes-ferias/index.ts` — replace lines 33-42 (the getClaims block) with `getUser()`.

