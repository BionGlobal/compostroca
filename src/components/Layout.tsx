import { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import compostrocaIcon from '@/assets/compostroca-icon.png';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <img src={compostrocaIcon} alt="Compostroca" className="h-8 w-8" />
          <div className="text-center">
            <h1 className="text-xl font-bold">Compostroca</h1>
            <p className="text-sm opacity-90">Gestão de Compostagem Urbana</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 pb-20">
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
};