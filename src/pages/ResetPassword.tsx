import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // Timeout: if no session after 8s, show expired message
    const timeout = setTimeout(() => {
      setSessionReady((prev) => {
        if (!prev) setError('expired');
        return prev;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Sign out after password update
      await supabase.auth.signOut();

      // Redirect to auth with prefilled password (base64 encoded)
      const encoded = btoa(newPassword);
      navigate(`/auth?newPassword=1&prefillPassword=${encodeURIComponent(encoded)}`, { replace: true });
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setError(err?.message || 'Erro ao atualizar a senha. Tente novamente.');
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a senha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    const isExpired = error === 'expired';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center space-y-4 text-foreground text-center">
          <img src="/lovable-uploads/compostroca-app-logo.png" alt="Compostroca" className="h-12 w-12" />
          {isExpired ? (
            <>
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="font-semibold">Link expirado ou já utilizado</p>
              <p className="text-sm text-muted-foreground">Solicite um novo link de recuperação na tela de login.</p>
              <Button onClick={() => navigate('/auth')} className="mt-2">
                Ir para Login
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="opacity-80">Verificando link de recuperação...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="p-2 rounded-full mb-4">
            <img src="/lovable-uploads/compostroca-app-logo.png" alt="Compostroca App Logo" className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
          <p className="text-muted-foreground text-center">Escolha uma nova senha para sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova Senha</CardTitle>
            <CardDescription>
              Digite e confirme sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Validation indicators */}
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${passwordValid ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Mínimo 6 caracteres</span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-green-500' : 'text-destructive'}`}>
                    {passwordsMatch ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    <span>{passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !passwordValid || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="w-full mt-8 text-center text-xs text-muted-foreground">
          <a href="https://www.bion.global" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Powered by Bion ⚡
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
