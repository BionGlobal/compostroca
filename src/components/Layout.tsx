import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { BackgroundParticles } from './BackgroundParticles';
import { HamburgerMenu } from './HamburgerMenu';
const compostrocaIcon = '/lovable-uploads/compostroca-app-logo.png';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
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
          
          {/* Hamburger Menu for all devices */}
          <HamburgerMenu />
        </div>
      </header>
      
      <main className="flex-1 pb-24 relative z-10">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
};