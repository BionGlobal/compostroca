

# Diagnóstico: Usuário `marciocobalea@gmail.com` não consegue cadastrar

## Problema Real

O usuário **já existe** no banco de dados. Foi registrado em **09/08/2025**, com email confirmado e último login em 26/09/2025. O perfil dele está com status **`rejected`**.

Ele provavelmente esqueceu que já tinha conta. O erro "User already registered" do Supabase é correto -- a conta existe.

## Solução (duas ações)

### 1. Ação administrativa imediata (migration)
Reativar o perfil do usuário, mudando o status de `rejected` para `pending` para que ele entre novamente no fluxo de aprovação:

```sql
UPDATE profiles 
SET status = 'pending', 
    approved_at = NULL, 
    updated_at = now()
WHERE user_id = 'a432ca6c-0931-4113-bae3-9c437bffdeb1';
```

### 2. Melhoria no código de signup (useAuth.ts)
Quando o Supabase retorna erro `User already registered`, em vez de mostrar apenas "Este email já está cadastrado", mostrar uma mensagem mais útil orientando o usuário a fazer login ou recuperar a senha:

**Arquivo: `src/hooks/useAuth.ts`** (linha ~115)
- Mudar a mensagem de erro para: *"Este email já possui uma conta. Tente fazer login ou use 'Esqueci minha senha' para recuperar o acesso."*

Isso resolve tanto o caso imediato do Marcio quanto previne confusão futura de outros usuários.

