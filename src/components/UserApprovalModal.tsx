import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PendingUser } from '@/hooks/useUserManagement';
import { UserCheck, UserX, Shield, Eye, Settings } from 'lucide-react';

interface UserApprovalModalProps {
  user: PendingUser | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (userId: string, role: 'local_admin' | 'auditor', authorizedUnits: string[]) => Promise<boolean>;
  onReject: (userId: string) => Promise<boolean>;
}

export const UserApprovalModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: UserApprovalModalProps) => {
  const [selectedRole, setSelectedRole] = useState<'local_admin' | 'auditor'>('local_admin');
  const [authorizedUnits, setAuthorizedUnits] = useState<string[]>(['CWB001']);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleApprove = async () => {
    setLoading(true);
    const success = await onApprove(user.user_id, selectedRole, authorizedUnits);
    if (success) {
      onClose();
      setSelectedRole('local_admin');
      setAuthorizedUnits(['CWB001']);
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    const success = await onReject(user.user_id);
    if (success) {
      onClose();
    }
    setLoading(false);
  };

  const handleUnitChange = (unit: string, checked: boolean) => {
    if (checked) {
      setAuthorizedUnits(prev => [...prev, unit]);
    } else {
      setAuthorizedUnits(prev => prev.filter(u => u !== unit));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'local_admin':
        return <Settings className="h-4 w-4" />;
      case 'auditor':
        return <Eye className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'local_admin':
        return 'Acesso completo às unidades autorizadas';
      case 'auditor':
        return 'Apenas visualização, sem poder modificar dados';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Aprovar Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Informações do Usuário</h4>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Nome:</span> {user.full_name || 'Não informado'}</p>
              <p><span className="font-medium">Organização:</span> {user.organization_code}</p>
              <p><span className="font-medium">Data do Cadastro:</span> {new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="role">Nível de Acesso</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'local_admin' | 'auditor')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local_admin">
                    <div className="flex items-center gap-2">
                      {getRoleIcon('local_admin')}
                      <div>
                        <div className="font-medium">Administrador Local</div>
                        <div className="text-xs text-muted-foreground">
                          {getRoleDescription('local_admin')}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="auditor">
                    <div className="flex items-center gap-2">
                      {getRoleIcon('auditor')}
                      <div>
                        <div className="font-medium">Auditor</div>
                        <div className="text-xs text-muted-foreground">
                          {getRoleDescription('auditor')}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidades Autorizadas</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="CWB001"
                    checked={authorizedUnits.includes('CWB001')}
                    onCheckedChange={(checked) => handleUnitChange('CWB001', checked as boolean)}
                  />
                  <Label htmlFor="CWB001" className="text-sm">
                    CWB001 - Curitiba
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <UserX className="h-4 w-4" />
            Rejeitar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || authorizedUnits.length === 0}
            className="flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};