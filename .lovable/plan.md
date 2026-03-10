

# Fix: Recovery Email Link Failing

## Root Cause

The `redirect_to` in the recovery email points to `localhost:3000` because `window.location.origin` returns localhost in dev/preview. Supabase also strips paths not whitelisted in Redirect URLs config.

## Fix (2 parts)

### Part 1: Supabase Dashboard (manual)

In **Authentication > URL Configuration > Redirect URLs**, add:
- `https://compostroca.bion.global/**`

### Part 2: Code changes

**`src/hooks/useAuth.ts`** — hardcode production URL:
```typescript
const redirectUrl = 'https://compostroca.bion.global/reset-password';
```

**`src/App.tsx`** — add global `PASSWORD_RECOVERY` listener that redirects to `/reset-password` if the user lands on any other page with a recovery token (self-healing fallback).

**`src/pages/ResetPassword.tsx`** — add 8-second timeout on the loading state. If no session arrives, show "Link expirado ou já utilizado" with a button to request a new one.

