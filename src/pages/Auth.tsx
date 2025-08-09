import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// --- Componente de Senha Embutido ---
export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={props.disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? 'Ocultar senha' : 'Exibir senha'}
          </span>
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
// --- Fim do Componente de Senha ---

const Auth = () => {
  const [isLoginView, setIsLoginView] = useState(true);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  
  // Loading states
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  const { signIn, signUp, sendPasswordResetEmail, isAuthenticated, loading } = useAuth();
  
  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    await signIn(loginEmail, loginPassword);
    setLoginLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFullName);
    if (!error) {
      setIsLoginView(true); // Switch to login view after successful signup
    }
    setSignupLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    await sendPasswordResetEmail(resetEmail);
    setResetLoading(false);
  };

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-foreground">
          <img src="/lovable-uploads/bion-logo1.png" alt="Bion" className="h-12 w-12" />
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="opacity-80">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/lovable-uploads/compostroca-app-logo.png" alt="Compostroca App Logo" className="h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Compostroca</h1>
          <p className="text-muted-foreground text-center">Gestão de Compostagem Comunitária</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLoginView ? 'Acesso ao Sistema' : 'Crie sua Conta'}</CardTitle>
            <CardDescription>
              {isLoginView ? 'Entre com sua conta para continuar.' : 'Preencha os dados abaixo para se cadastrar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoginView ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <PasswordInput id="login-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Sua senha" required autoComplete="current-password" />
                  <div className="text-right text-xs">
                    <Dialog>
                      <DialogTrigger asChild>
                         <Button variant="link" size="sm" className="p-0 h-auto">Esqueceu sua senha?</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Recuperar Senha</DialogTitle>
                          <DialogDescription>Digite seu email para enviarmos um link de recuperação.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handlePasswordReset}>
                          <div className="space-y-2 py-4">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu@email.com" required />
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full" disabled={resetLoading}>
                              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enviar Link de Recuperação
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input id="signup-name" type="text" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} placeholder="Seu nome completo" required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <PasswordInput id="signup-password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={signupLoading}>
                  {signupLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Conta'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <Button variant="link" onClick={() => setIsLoginView(!isLoginView)} className="text-muted-foreground">
              {isLoginView ? "Não tem uma conta? Cadastre-se aqui" : "Já tem uma conta? Faça o login"}
            </Button>
          </CardFooter>
        </Card>

        <footer className="w-full py-3 text-center text-xs text-muted-foreground relative z-10 mt-4">
          <a href="https://www.bion.global" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            Powered by Bion ⚡
          </a>
        </footer>
      </div>
    </div>
  );
};

export default Auth;