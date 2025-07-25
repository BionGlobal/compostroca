import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { BackgroundParticles } from './BackgroundParticles';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
const compostrocaIcon = '/lovable-uploads/b5447ccd-c863-4e8a-9880-d66ce4a8a5c4.png';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col relative">
      <BackgroundParticles />
      
      <header className="glass-light border-0 border-b border-border/20 p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={compostrocaIcon} alt="Compostroca" className="h-8 w-8 float" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Compostroca
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão de Compostagem Urbana
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {profile?.full_name || 'Usuário'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 pb-20 relative z-10">
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
};