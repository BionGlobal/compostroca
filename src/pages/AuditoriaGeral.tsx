import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Search, Shield, Building2, FileCheck, TrendingUp } from 'lucide-react';
import { useAuditoriaGeral } from '@/hooks/useAuditoriaGeral';
import { UnidadeCard } from '@/components/UnidadeCard';
import { LoteSearchTable } from '@/components/LoteSearchTable';

export default function AuditoriaGeral() {
  const {
    unidades,
    lotesFinalizados,
    loadingUnidades,
    loadingLotes,
    searchTerm,
    currentPage,
    totalPages,
    totalCount,
    handleSearch,
    handlePageChange
  } = useAuditoriaGeral();

  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchInput);
  };

  const getTotalStats = () => {
    const totalLotes = unidades.reduce((acc, u) => acc + u.total_lotes, 0);
    const totalAtivos = unidades.reduce((acc, u) => acc + u.lotes_ativos, 0);
    const totalFinalizados = unidades.reduce((acc, u) => acc + u.lotes_finalizados, 0);
    
    return { totalLotes, totalAtivos, totalFinalizados };
  };

  const { totalLotes, totalAtivos, totalFinalizados } = getTotalStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Portal de Auditoria Geral</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparência total do projeto Compostroca. Verifique a integridade e rastreabilidade 
              de todos os lotes de compostagem em todas as nossas unidades.
            </p>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{unidades.length}</div>
                  <div className="text-sm text-muted-foreground">Unidades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileCheck className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{totalLotes}</div>
                  <div className="text-sm text-muted-foreground">Total de Lotes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{totalAtivos}</div>
                  <div className="text-sm text-muted-foreground">Lotes Ativos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{totalFinalizados}</div>
                  <div className="text-sm text-muted-foreground">Lotes Finalizados</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Seção de Unidades */}
        <section>
          <CardHeader className="px-0">
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Unidades de Compostagem
            </CardTitle>
            <CardDescription>
              Explore a esteira de produção de cada unidade do projeto
            </CardDescription>
          </CardHeader>
          
          {loadingUnidades ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="h-64">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unidades.map((unidade) => (
                <UnidadeCard key={unidade.id} {...unidade} />
              ))}
            </div>
          )}
        </section>

        {/* Seção de Auditoria de Lotes */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="mr-2 h-5 w-5" />
                Auditoria de Lotes Finalizados
              </CardTitle>
              <CardDescription>
                Busque e verifique qualquer lote finalizado por código único ou hash de integridade
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <Input
                  placeholder="Buscar por código do lote ou hash..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loadingLotes}>
                  <Search className="h-4 w-4" />
                </Button>
              </form>

              {/* Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {searchTerm ? `Resultados para "${searchTerm}"` : 'Todos os lotes finalizados'}
                    </span>
                    {totalCount > 0 && (
                      <Badge variant="secondary">
                        {totalCount} lote{totalCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                <LoteSearchTable lotes={lotesFinalizados} loading={loadingLotes} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        {totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}