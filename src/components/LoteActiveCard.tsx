import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Scale, 
  Users, 
  Calendar, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useLotes } from '@/hooks/useLotes';
import { useAuth } from '@/hooks/useAuth';
import { formatPesoDisplay } from '@/lib/organizationUtils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useLoteUpdates } from '@/contexts/LoteContext';

export const LoteActiveCard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [suspiciousLote, setSuspiciousLote] = useState<any>(null);
  const { loteAtivoCaixa01, voluntariosCount, loading, criarNovoLote, refetch } = useLotes();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { notifyLoteUpdate } = useLoteUpdates();

  // Debug logs
  console.log('🔍 LoteActiveCard - Debug Info:', {
    loading,
    loteAtivoCaixa01,
    voluntariosCount,
    profile: profile ? { user_role: profile.user_role, organization_code: profile.organization_code } : null,
    user: user ? { id: user.id } : null
  });

  const canCreateLote = profile?.user_role === 'super_admin' || profile?.user_role === 'local_admin';

  // Detectar lote suspeito ao carregar
  React.useEffect(() => {
    const checkSuspiciousLote = async () => {
      if (!profile?.organization_code || loteAtivoCaixa01) return;

      const { data } = await supabase
        .from('lotes')
        .select('*')
        .eq('unidade', profile.organization_code)
        .eq('caixa_atual', 1)
        .eq('status', 'em_processamento')
        .not('data_encerramento', 'is', null)
        .is('deleted_at', null)
        .maybeSingle();

      if (data && data.peso_inicial === 0) {
        setSuspiciousLote(data);
      }
    };

    checkSuspiciousLote();
  }, [profile, loteAtivoCaixa01]);

  const handleCriarLote = async () => {
    if (!canCreateLote) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem criar novos lotes",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await criarNovoLote();
      toast({
        title: "Sucesso!",
        description: "Novo lote criado na Caixa 01",
      });
      notifyLoteUpdate();
      await refetch();
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o novo lote",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReativarLote = async () => {
    const loteToReactivate = suspiciousLote?.codigo || 'CWB001-09102025A379';
    
    if (!canCreateLote) {
      toast({
        title: "Sem permissão",
        description: "Apenas administradores podem reativar lotes",
        variant: "destructive",
      });
      return;
    }

    setIsReactivating(true);
    try {
      console.log('🔄 Chamando Edge Function para reativar lote:', loteToReactivate);
      
      const { data, error } = await supabase.functions.invoke('reativar-lote-entregas', {
        body: { codigo_lote: loteToReactivate }
      });

      if (error) throw error;

      console.log('✅ Resposta da Edge Function:', data);

      toast({
        title: "✅ Lote Reativado!",
        description: data.message || "Lote liberado para receber entregas",
      });

      // Limpar lote suspeito
      setSuspiciousLote(null);

      // Forçar atualização em cascata
      notifyLoteUpdate();
      await refetch();
      
      // Última opção: recarregar página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('❌ Erro ao reativar lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reativar o lote",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando lote ativo...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não há usuário ou perfil, mostrar aviso
  if (!user || !profile) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">
              Usuário não autenticado. Faça login para acessar o sistema de lotes.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-lg border-2 ${
      loteAtivoCaixa01 
        ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50' 
        : 'border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50'
    }`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardTitle className="flex items-center justify-between text-xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${loteAtivoCaixa01 ? 'bg-green-500' : 'bg-orange-500'}`}>
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">SISTEMA DE LOTES</span>
              <div className="text-sm font-normal text-muted-foreground">Caixa 01 - Esteira de Produção</div>
            </div>
          </div>
          {loteAtivoCaixa01 ? (
            <Badge variant="secondary" className="bg-green-500 text-white border-green-600 text-sm px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              ATIVO
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-orange-500 text-white border-orange-600 text-sm px-3 py-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              INATIVO
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loteAtivoCaixa01 ? (
          <>
            {/* Informações do Lote Ativo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{loteAtivoCaixa01.codigo}</h3>
                <Badge variant="outline" className="font-mono">
                  {loteAtivoCaixa01.unidade}{loteAtivoCaixa01.linha_producao}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Peso Entregas:</span>
                    <div className="font-medium">
                      {formatPesoDisplay(loteAtivoCaixa01.peso_atual)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      (+ {formatPesoDisplay(loteAtivoCaixa01.peso_atual * 0.35)} cepilho ao finalizar)
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Voluntários:</span>
                    <div className="font-medium">{voluntariosCount}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Iniciado:</span>
                    <div className="font-medium">
                      {format(new Date(loteAtivoCaixa01.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Semana:</span>
                    <div className="font-medium">{loteAtivoCaixa01.semana_atual}/8</div>
                  </div>
                </div>
              </div>

              {loteAtivoCaixa01.latitude && loteAtivoCaixa01.longitude && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-muted-foreground">Localização:</span>
                    <div className="font-medium text-xs break-all">
                      {Number(loteAtivoCaixa01.latitude).toFixed(6)}, {Number(loteAtivoCaixa01.longitude).toFixed(6)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status atual */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-800 dark:text-green-200 font-medium text-sm">
                  Lote ativo e pronto para receber entregas
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sem Lote Ativo - DESTAQUE VISUAL MÁXIMO */}
            <div className="p-6 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 rounded-xl shadow-inner">
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <AlertCircle className="h-10 w-10 text-white" />
                </div>
                
                <div>
                  <h4 className="text-2xl font-bold text-orange-900 mb-2">
                    🚨 ATENÇÃO: SISTEMA INATIVO
                  </h4>
                  <p className="text-lg font-medium text-orange-800 mb-3">
                    Nenhum lote ativo na Caixa 01
                  </p>
                  <p className="text-orange-700 mb-4">
                    Para começar a receber entregas de resíduos orgânicos, é necessário iniciar um novo lote.
                  </p>
                </div>

                <div className="bg-white/70 p-4 rounded-lg border border-orange-300">
                  <div className="text-sm text-orange-800 grid grid-cols-2 gap-2 text-left">
                    <div><strong>Organização:</strong> {profile?.organization_code}</div>
                    <div><strong>Usuário:</strong> {profile?.full_name}</div>
                    <div><strong>Perfil:</strong> {profile?.user_role}</div>
                    <div><strong>Status:</strong> {profile?.status}</div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      canCreateLote 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {canCreateLote ? '✅ Autorizado a criar lotes' : '❌ Sem permissão para criar lotes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Emergência - Reativar Lote Bloqueado */}
            {canCreateLote && suspiciousLote && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Lote <span className="font-mono font-bold">{suspiciousLote.codigo}</span> está bloqueado para entregas
                  </p>
                </div>
                <Button
                  onClick={handleReativarLote}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={isReactivating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isReactivating ? 'animate-spin' : ''}`} />
                  {isReactivating ? 'Reativando...' : `🔄 Reativar ${suspiciousLote.codigo}`}
                </Button>
              </div>
            )}

            {/* Botão para Criar Novo Lote - SUPER DESTACADO */}
            {canCreateLote && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-2 border-green-400">
                  <p className="text-center text-green-800 font-medium mb-3">
                    🎯 Você tem permissão para iniciar um novo lote!
                  </p>
                  
                  <Button 
                    onClick={handleCriarLote}
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg py-4 px-8 shadow-lg transform transition-all duration-200 hover:scale-105"
                    size="lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                        Criando Novo Lote...
                      </>
                    ) : (
                      <>
                        <Plus className="h-6 w-6 mr-3" />
                        🚀 INICIAR NOVO LOTE AGORA
                      </>
                    )}
                  </Button>
                  
                  <p className="text-center text-sm text-green-700 mt-2">
                    Este botão criará um novo lote e liberará o sistema para entregas
                  </p>
                </div>
              </div>
            )}

            {!canCreateLote && (
              <div className="bg-gradient-to-r from-red-100 to-orange-100 p-4 rounded-lg border-2 border-red-400">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <h5 className="font-bold text-red-800 mb-2">🔒 ACESSO RESTRITO</h5>
                  <p className="text-red-700 mb-2">
                    Apenas administradores podem iniciar novos lotes
                  </p>
                  <p className="text-sm text-red-600">
                    Entre em contato com um super_admin ou local_admin para iniciar um novo lote
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};