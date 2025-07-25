import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, Phone, Mail, MapPin, Edit, History, Loader2, Trash2 } from 'lucide-react';
import { useVoluntarios } from '@/hooks/useVoluntarios';
import { VoluntarioForm } from '@/components/VoluntarioForm';
import { HistoricoVoluntario } from '@/components/HistoricoVoluntario';

const Voluntarios = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVoluntario, setEditingVoluntario] = useState(null);
  const [showHistorico, setShowHistorico] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [voluntarioToDelete, setVoluntarioToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { 
    voluntarios, 
    loading, 
    createVoluntario, 
    updateVoluntario,
    deleteVoluntario 
  } = useVoluntarios();

  const filteredVoluntarios = useMemo(() => {
    if (!searchTerm.trim()) return voluntarios;
    
    const term = searchTerm.toLowerCase();
    return voluntarios.filter((v) =>
      v.nome.toLowerCase().includes(term) ||
      v.numero_balde.toString().includes(term) ||
      v.cpf.includes(term) ||
      v.email.toLowerCase().includes(term)
    );
  }, [voluntarios, searchTerm]);

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCreateVoluntario = async (data) => {
    try {
      setFormLoading(true);
      await createVoluntario({
        ...data,
        unidade: 'CWB001',
      });
      setShowForm(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateVoluntario = async (data) => {
    if (!editingVoluntario) return;
    
    try {
      setFormLoading(true);
      await updateVoluntario(editingVoluntario.id, data);
      setEditingVoluntario(null);
      setShowForm(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (voluntario) => {
    setEditingVoluntario(voluntario);
    setShowForm(true);
  };

  const handleHistoricoClick = (voluntario) => {
    setShowHistorico(voluntario);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVoluntario(null);
  };

  const handleCloseHistorico = () => {
    setShowHistorico(null);
  };

  const handleDeleteClick = (voluntario) => {
    setVoluntarioToDelete(voluntario);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!voluntarioToDelete) return;
    
    try {
      setDeleteLoading(true);
      await deleteVoluntario(voluntarioToDelete.id);
      setDeleteConfirmOpen(false);
      setVoluntarioToDelete(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setVoluntarioToDelete(null);
  };

  const formatTelefone = (telefone: string) => {
    if (telefone.length === 11) {
      return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
    }
    if (telefone.length === 10) {
      return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
    }
    return telefone;
  };

  // Se estiver mostrando histórico, renderize apenas o componente de histórico
  if (showHistorico) {
    return (
      <HistoricoVoluntario 
        voluntario={showHistorico}
        onBack={handleCloseHistorico}
      />
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header com busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voluntários Cadastrados
            {!loading && (
              <Badge variant="secondary" className="ml-2">
                {voluntarios.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, balde, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="default" 
              size="icon"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Lista de Voluntários */}
      {!loading && (
        <div className="space-y-3">
          {filteredVoluntarios.map((voluntario) => (
            <Card key={voluntario.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={voluntario.foto_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(voluntario.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h3 className="font-semibold truncate">{voluntario.nome}</h3>
                      <span className="bg-earth text-earth-foreground px-2 py-1 rounded-full text-xs font-medium self-start shrink-0">
                        Balde {voluntario.numero_balde.toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{voluntario.email}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatTelefone(voluntario.telefone)}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{voluntario.endereco}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:flex-1"
                        onClick={() => handleEditClick(voluntario)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:flex-1"
                        onClick={() => handleHistoricoClick(voluntario)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Histórico
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full sm:flex-1"
                        onClick={() => handleDeleteClick(voluntario)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && filteredVoluntarios.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum voluntário encontrado para a busca realizada' : 'Nenhum voluntário cadastrado ainda'}
            </p>
            {!searchTerm && (
              <Button 
                className="mt-4" 
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro voluntário
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog do formulário */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVoluntario ? 'Editar Voluntário' : 'Novo Voluntário'}
            </DialogTitle>
          </DialogHeader>
          <VoluntarioForm
            voluntario={editingVoluntario}
            onSubmit={editingVoluntario ? handleUpdateVoluntario : handleCreateVoluntario}
            onCancel={handleCloseForm}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o voluntário <strong>{voluntarioToDelete?.nome}</strong>?
              <br />
              <br />
              O balde <strong>{voluntarioToDelete?.numero_balde?.toString().padStart(2, '0')}</strong> será liberado para uso por outro voluntário.
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={deleteLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Voluntarios;