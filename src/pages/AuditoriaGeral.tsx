import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Shield, Building2, FileCheck, TrendingUp, Scale, Leaf, Users } from 'lucide-react';
import { useAuditoriaGeral } from '@/hooks/useAuditoriaGeral';
import { UnidadeCard } from '@/components/UnidadeCard';
import { LoteCardList } from '@/components/LoteCardList';
import { AdvancedSearchFilters } from '@/components/AdvancedSearchFilters';
import { ChainIntegrityMonitor } from '@/components/ChainIntegrityMonitor';

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
    filters,
    handleSearch,
    handleFiltersChange,
    handlePageChange
  } = useAuditoriaGeral();

  const [searchInput, setSearchInput] = useState('');

  const getTotalStats = () => {
    const totalLotes = unidades.reduce((acc, u) => acc + u.total_lotes, 0);
    const totalAtivos = unidades.reduce((acc, u) => acc + u.lotes_ativos, 0);
    const totalFinalizados = unidades.reduce((acc, u) => acc + u.lotes_finalizados, 0);
    
    // Calcular totais de CO2e e peso a partir dos lotes finalizados
    const totalCO2e = lotesFinalizados.reduce((acc, lote) => acc + (lote.co2eq_evitado || 0), 0);
    const totalPeso = lotesFinalizados.reduce((acc, lote) => acc + (lote.peso_inicial || 0), 0);
    
    return { totalLotes, totalAtivos, totalFinalizados, totalCO2e, totalPeso };
  };

  const { totalLotes, totalAtivos, totalFinalizados, totalCO2e, totalPeso } = getTotalStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <img 
                src="/lovable-uploads/compostroca-app-logo.png" 
                alt="Compostroca" 
                className="h-16 w-auto"
              />
              <h1 className="text-3xl font-bold">Portal de Transparência Compostroca</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Verifique a integridade e rastreabilidade da produção e impacto dos lotes de composto finalizados.
            </p>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-xl font-bold">{unidades.length}</div>
                  <div className="text-xs text-muted-foreground">Unidades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileCheck className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-xl font-bold">{totalLotes}</div>
                  <div className="text-xs text-muted-foreground">Total Lotes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-xl font-bold">{totalAtivos}</div>
                  <div className="text-xs text-muted-foreground">Ativos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-xl font-bold">{totalFinalizados}</div>
                  <div className="text-xs text-muted-foreground">Finalizados</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Scale className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-xl font-bold">{totalPeso.toFixed(0)}kg</div>
                  <div className="text-xs text-muted-foreground">Peso Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Leaf className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                  <div className="text-xl font-bold">{totalCO2e.toFixed(0)}kg</div>
                  <div className="text-xs text-muted-foreground">CO2e Evitado</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Monitor de Integridade da Cadeia */}
        <section>
          <ChainIntegrityMonitor autoValidate={true} />
        </section>

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
        <section className="space-y-6">
          <AdvancedSearchFilters
            searchTerm={searchInput}
            setSearchTerm={setSearchInput}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            loading={loadingLotes}
            unidades={unidades}
          />

          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {searchTerm || Object.values(filters).some(v => v) ? 
                        'Resultados da busca' : 'Últimos Lotes'}
                    </span>
                    {totalCount > 0 && (
                      <Badge variant="secondary">
                        {totalCount} lote{totalCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                <LoteCardList lotes={lotesFinalizados} loading={loadingLotes} />

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

      {/* Footer com "Powered by Bion" */}
      <footer className="border-t bg-card/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4">
            <a href="https://www.bion.global" target="_blank" rel="noopener noreferrer">
              <img 
                src="/lovable-uploads/powered-by-bion.png" 
                alt="Powered by Bion" 
                className="h-12 opacity-80 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}