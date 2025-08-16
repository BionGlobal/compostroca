import { useState } from 'react';
import { Menu, Settings, Users, FileText, LogOut, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { DeviceTestModalEnhanced } from './DeviceTestModalEnhanced';

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'default';
    case 'local_admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'local_admin':
      return 'Admin Local';
    case 'volunteer':
      return 'Voluntário';
    default:
      return 'Usuário';
  }
};

export const HamburgerMenu = () => {
  const [open, setOpen] = useState(false);
  const [deviceTestOpen, setDeviceTestOpen] = useState(false);
  const { signOut, profile } = useAuth();

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  const closeMenu = () => setOpen(false);

  const openDeviceTest = () => {
    setDeviceTestOpen(true);
    setOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 sm:w-96 p-0">
          <div className="flex flex-col h-full">
            {/* User Info Section */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {profile?.full_name || 'Usuário'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profile?.organization_code || 'Sem organização'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Badge variant={getRoleBadgeVariant(profile?.user_role || '')}>
                  {getRoleLabel(profile?.user_role || '')}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Menu Items */}
            <div className="flex-1 p-6 space-y-2">
              {(profile?.user_role === 'super_admin' || profile?.user_role === 'local_admin') && (
                <>
                  {profile?.user_role === 'super_admin' && (
                    <Link to="/admin/configuracoes" onClick={closeMenu}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12"
                      >
                        <Settings className="h-5 w-5" />
                        Configurações do Sistema
                      </Button>
                    </Link>
                  )}
                  
                  <Link to="/admin/usuarios" onClick={closeMenu}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Users className="h-5 w-5" />
                      Gerenciar Usuários
                    </Button>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    onClick={openDeviceTest}
                    className="w-full justify-start gap-3 h-12"
                  >
                    <Smartphone className="h-5 w-5" />
                    Testar Aparelho
                  </Button>
                </>
              )}
              
              <Link to="/relatorios" onClick={closeMenu}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                >
                  <FileText className="h-5 w-5" />
                  Relatórios
                </Button>
              </Link>
            </div>

            <Separator />

            {/* Sign Out */}
            <div className="p-6">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <DeviceTestModalEnhanced 
        open={deviceTestOpen} 
        onOpenChange={setDeviceTestOpen} 
      />
    </>
  );
};