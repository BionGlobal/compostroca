import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { BackgroundParticles } from './BackgroundParticles';
import compostrocaIcon from '@/assets/compostroca-icon.png';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <BackgroundParticles />
      
      <header className="glass-strong border-0 border-b border-border/10 p-6 relative z-10">
        <div className="absolute inset-0 bg-gradient-mesh opacity-20" />
        <div className="flex items-center justify-center gap-4 relative z-10">
          <div className="glass-light rounded-2xl p-3 pulse-glow">
            <img src={compostrocaIcon} alt="Compostroca" className="h-10 w-10 float" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gradient-primary mb-1">
              Compostroca
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Gestão Inteligente de Compostagem Urbana
            </p>
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