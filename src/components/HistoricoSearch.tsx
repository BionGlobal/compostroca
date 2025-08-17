import { useState } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import type { SearchFilters } from '@/hooks/useHistoricoLotes';

interface HistoricoSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  totalEventos: number;
  eventosFiltrados: number;
  loading?: boolean;
}

export const HistoricoSearch = ({
  filters,
  onFiltersChange,
  onDownloadPDF,
  onDownloadExcel,
  totalEventos,
  eventosFiltrados,
  loading = false
}: HistoricoSearchProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleQueryChange = (query: string) => {
    onFiltersChange({ ...filters, query });
  };

  const handleTipoChange = (tipo: string) => {
    onFiltersChange({ 
      ...filters, 
      tipo: tipo === 'all' ? undefined : tipo as any 
    });
  };

  const handleDataInicioChange = (dataInicio: string) => {
    onFiltersChange({ ...filters, dataInicio });
  };

  const handleDataFimChange = (dataFim: string) => {
    onFiltersChange({ ...filters, dataFim });
  };

  const clearFilters = () => {
    onFiltersChange({
      query: '',
      tipo: 'all'
    });
  };

  const activeFiltersCount = [
    filters.query,
    filters.tipo && filters.tipo !== 'all',
    filters.dataInicio,
    filters.dataFim
  ].filter(Boolean).length;

  return (
    <Card className="border-0 bg-background/50 backdrop-blur">
      <CardContent className="p-4 space-y-4">
        {/* Barra de pesquisa principal */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código do lote, validador..."
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtros</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Tipo de Evento</Label>
                      <Select 
                        value={filters.tipo || 'all'} 
                        onValueChange={handleTipoChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tipos</SelectItem>
                          <SelectItem value="novo_lote">Novo Lote</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="lote_finalizado">Lote Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-sm font-medium">Data Início</Label>
                        <Input
                          type="date"
                          value={filters.dataInicio || ''}
                          onChange={(e) => handleDataInicioChange(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Data Fim</Label>
                        <Input
                          type="date"
                          value={filters.dataFim || ''}
                          onChange={(e) => handleDataFimChange(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={loading || eventosFiltrados === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownloadPDF}
                    disabled={loading}
                    className="w-full justify-start"
                  >
                    Relatório PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownloadExcel}
                    disabled={loading}
                    className="w-full justify-start"
                  >
                    Planilha Excel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {eventosFiltrados} de {totalEventos} eventos
          </span>
          
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              <span>Filtros ativos:</span>
              <div className="flex gap-1">
                {filters.query && (
                  <Badge variant="secondary" className="text-xs">
                    "{filters.query}"
                  </Badge>
                )}
                {filters.tipo && filters.tipo !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.tipo === 'novo_lote' ? 'Novo Lote' : 
                     filters.tipo === 'manutencao' ? 'Manutenção' : 'Lote Finalizado'}
                  </Badge>
                )}
                {(filters.dataInicio || filters.dataFim) && (
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Período
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};