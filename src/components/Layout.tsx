// src/components/Layout.tsx (Nova versão)
import React from 'react';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  // Calcula o padding inferior dinamicamente
  // Se o usuário estiver logado, o padding precisa acomodar a navegação E a assinatura.
  // Se não, não precisa de padding extra.
  const mainContentPaddingBottom = user ? 'pb-32' : 'pb-4';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Conteúdo principal da página com padding inferior para não ser sobreposto pelo menu */}
      <main className={`flex-grow ${mainContentPaddingBottom}`}>{children}</main>

      {/* Se o usuário estiver logado, exibe a navegação e a assinatura */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
          {/* Menu de navegação inferior que você já tinha */}
          <BottomNavigation />

          {/* Nova assinatura "Powered by Bion" */}
          <div className="text-center text-xs text-muted-foreground py-1">
            <a
              href="https://www.bion.global"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              powered by Bion⚡
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;