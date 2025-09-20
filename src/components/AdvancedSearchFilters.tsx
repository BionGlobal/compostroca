import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FilterState {
  unidade: string;
  dataInicio: string;
  dataFim: string;
  validador: string;
}

interface AdvancedSearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: (term: string) => void;
  loading?: boolean;
  unidades: Array<{ codigo_unidade: string; nome: string }>;
}

export const AdvancedSearchFilters = ({
  searchTerm,
  setSearchTerm,
  filters,
  onFiltersChange,
  onSearch,
  loading = false,
  unidades
}: AdvancedSearchFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(localSearchTerm);
    onSearch(localSearchTerm);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    // Aplicar filtros automaticamente
    onSearch(searchTerm);
  };

  const clearFilters = () => {
    const emptyFilters = {
      unidade: '',
      dataInicio: '',
      dataFim: '',
      validador: ''
    };
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Busca Avançada de Lotes
          </div>
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardTitle>
        <CardDescription>
          Busque lotes por código, hash, validador ou utilize filtros avançados
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Buscar por código do lote, hash ou validador..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* Advanced Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              {/* Unidade Filter */}
              <div className="space-y-2">
                <Label htmlFor="unidade-filter">Unidade</Label>
                <Select
                  value={filters.unidade}
                  onValueChange={(value) => handleFilterChange('unidade', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as unidades</SelectItem>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.codigo_unidade} value={unidade.codigo_unidade}>
                        {unidade.codigo_unidade} - {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Início */}
              <div className="space-y-2">
                <Label htmlFor="data-inicio">Data Início</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label htmlFor="data-fim">Data Fim</Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                />
              </div>

              {/* Validador */}
              <div className="space-y-2">
                <Label htmlFor="validador-filter">Validador</Label>
                <Input
                  id="validador-filter"
                  placeholder="Nome do validador"
                  value={filters.validador}
                  onChange={(e) => handleFilterChange('validador', e.target.value)}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};