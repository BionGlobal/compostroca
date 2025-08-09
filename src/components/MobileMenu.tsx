import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Users, User, LogOut, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeProvider';

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const { signOut, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const menuItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/voluntarios', label: 'Voluntários' },
    { to: '/entregas', label: 'Entregas' },
    { to: '/lotes', label: 'Lotes' },
  ];

  if (profile?.user_role === 'super_admin') {
    menuItems.push({ to: '/admin/usuarios', label: 'Gerenciar Usuários' });
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[300px]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 mb-4 border-b">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/compostroca-app-logo.png" 
                alt="Compostroca" 
                className="h-8 w-8" 
              />
              <div>
                <h2 className="font-bold text-foreground">Compostroca</h2>
                <p className="text-xs text-muted-foreground">Gestão de Compostagem</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Tema</h3>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => {
                  const Icon = themeIcons[t];
                  return (
                    <Button
                      key={t}
                      variant={theme === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme(t)}
                      className="flex-1"
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {profile?.full_name || 'Usuário'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>

            <div className="text-center">
              <a 
                href="https://www.bion.global" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Powered by Bion ⚡
              </a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};