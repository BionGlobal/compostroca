import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, Plus, Phone, Mail, MapPin } from 'lucide-react';

const Voluntarios = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - será substituído por dados do Supabase
  const voluntarios = [
    {
      id: 1,
      nome: 'Maria Silva',
      email: 'maria.silva@email.com',
      telefone: '(41) 99999-1234',
      balde: '05',
      endereco: 'Rua das Flores, 123 - Centro',
      foto: null,
      status: 'ativo'
    },
    {
      id: 2,
      nome: 'João Santos',
      email: 'joao.santos@email.com',
      telefone: '(41) 99999-5678',
      balde: '12',
      endereco: 'Av. Principal, 456 - Batel',
      foto: null,
      status: 'ativo'
    },
    {
      id: 3,
      nome: 'Ana Costa',
      email: 'ana.costa@email.com',
      telefone: '(41) 99999-9101',
      balde: '08',
      endereco: 'Rua Verde, 789 - Água Verde',
      foto: null,
      status: 'ativo'
    },
  ];

  const filteredVoluntarios = voluntarios.filter(
    (v) =>
      v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.balde.includes(searchTerm)
  );

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header com busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voluntários Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou número do balde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="default" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Voluntários */}
      <div className="space-y-3">
        {filteredVoluntarios.map((voluntario) => (
          <Card key={voluntario.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={voluntario.foto || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(voluntario.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{voluntario.nome}</h3>
                    <span className="bg-earth text-earth-foreground px-2 py-1 rounded-full text-xs font-medium">
                      Balde {voluntario.balde}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{voluntario.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{voluntario.telefone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{voluntario.endereco}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Histórico
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVoluntarios.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum voluntário encontrado' : 'Nenhum voluntário cadastrado'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Voluntarios;