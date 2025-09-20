import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2, FileCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              CompostRoca
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema de Gestão de Compostagem Urbana com rastreabilidade completa e transparência total
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="text-left hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Portal de Auditoria
                </CardTitle>
                <CardDescription>
                  Acesse informações públicas de transparência, verifique a integridade dos lotes e explore as unidades de compostagem.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/audit">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Acessar Auditoria Geral
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="text-left hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-primary" />
                  Sistema Interno
                </CardTitle>
                <CardDescription>
                  Área restrita para usuários autorizados gerenciarem lotes, entregas e voluntários.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Fazer Login
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Acesso Rápido às Unidades</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="secondary" size="sm">
                <Link to="/CWB001">Fazenda Urbana Cajuru</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/CWB002">Fazenda Urbana Boqueirão</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/CWB003">Fazenda Urbana Portão</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
