import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function DiagnosticoTagoIO() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const executarTeste = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Iniciando teste Tago.io...');
      
      const { data, error } = await supabase.functions.invoke('testar-tago-io');
      
      if (error) {
        console.error('❌ Erro ao chamar função:', error);
        toast.error(`Erro: ${error.message}`);
        setTestResults({ error: error.message });
        return;
      }
      
      console.log('✅ Resposta recebida:', data);
      setTestResults(data);
      
      if (data.status_geral === 'SUCESSO') {
        toast.success('Todos os testes passaram!');
      } else {
        toast.warning('Alguns testes falharam. Verifique os detalhes.');
      }
      
    } catch (err: any) {
      console.error('❌ Erro crítico:', err);
      toast.error(`Erro crítico: ${err.message}`);
      setTestResults({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const executarColeta = async () => {
    setLoading(true);
    
    try {
      console.log('📡 Iniciando coleta manual...');
      
      const { data, error } = await supabase.functions.invoke('coleta-diaria-sensores');
      
      if (error) {
        console.error('❌ Erro ao coletar:', error);
        toast.error(`Erro: ${error.message}`);
        return;
      }
      
      console.log('✅ Coleta realizada:', data);
      toast.success(`Coleta concluída! ${data.leituras_salvas || 0} leituras salvas`);
      
    } catch (err: any) {
      console.error('❌ Erro crítico:', err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (ok: boolean) => {
    return ok ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Diagnóstico Tago.io</h1>
        <p className="text-muted-foreground">
          Teste a integração com a API Tago.io em tempo real
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ações de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={executarTeste} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Executar Teste Completo
                </>
              )}
            </Button>

            <Button 
              onClick={executarColeta} 
              disabled={loading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Coletando...
                </>
              ) : (
                '📡 Executar Coleta Manual'
              )}
            </Button>
          </CardContent>
        </Card>

        {testResults && !testResults.error && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Status Geral</CardTitle>
                  <Badge 
                    variant={testResults.status_geral === 'SUCESSO' ? 'default' : 'destructive'}
                  >
                    {testResults.status_geral}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {testResults.testes_sucesso} de {testResults.total_testes} testes passaram
                </p>
              </CardContent>
            </Card>

            {testResults.resultados?.testes && (
              <>
                {/* Health Check */}
                {testResults.resultados.testes.health_check && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.resultados.testes.health_check.ok)}
                        <CardTitle className="text-lg">Health Check da API</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status HTTP:</span>
                        <Badge variant="outline">
                          {testResults.resultados.testes.health_check.status}
                        </Badge>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(testResults.resultados.testes.health_check.body, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Autenticação */}
                {testResults.resultados.testes.autenticacao && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.resultados.testes.autenticacao.ok)}
                        <CardTitle className="text-lg">Autenticação</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status HTTP:</span>
                        <Badge variant={testResults.resultados.testes.autenticacao.ok ? 'default' : 'destructive'}>
                          {testResults.resultados.testes.autenticacao.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Token configurado:</span>
                        <Badge variant={testResults.resultados.token_configurado ? 'default' : 'destructive'}>
                          {testResults.resultados.token_configurado ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                      {testResults.resultados.testes.autenticacao.body && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(testResults.resultados.testes.autenticacao.body, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Dados do Sensor */}
                {testResults.resultados.testes.dados_sensor && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.resultados.testes.dados_sensor.ok)}
                        <CardTitle className="text-lg">Dados do Sensor</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status HTTP:</span>
                        <Badge variant={testResults.resultados.testes.dados_sensor.ok ? 'default' : 'destructive'}>
                          {testResults.resultados.testes.dados_sensor.status}
                        </Badge>
                      </div>
                      {testResults.resultados.testes.dados_sensor.body && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                          {JSON.stringify(testResults.resultados.testes.dados_sensor.body, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Validação de Campos */}
                {testResults.resultados.testes.validacao_campos && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.resultados.testes.validacao_campos.ok)}
                        <CardTitle className="text-lg">Validação de Campos</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Campos encontrados:</span>
                          <Badge variant="default">
                            {testResults.resultados.testes.validacao_campos.campos_encontrados?.length || 0} / 7
                          </Badge>
                        </div>
                        
                        {testResults.resultados.testes.validacao_campos.campos_encontrados?.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-xs text-green-600 mb-1">✅ Encontrados:</p>
                            <div className="flex flex-wrap gap-1">
                              {testResults.resultados.testes.validacao_campos.campos_encontrados.map((campo: string) => (
                                <Badge key={campo} variant="outline" className="text-xs">
                                  {campo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {testResults.resultados.testes.validacao_campos.campos_faltantes?.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-xs text-red-600 mb-1">❌ Faltantes:</p>
                            <div className="flex flex-wrap gap-1">
                              {testResults.resultados.testes.validacao_campos.campos_faltantes.map((campo: string) => (
                                <Badge key={campo} variant="destructive" className="text-xs">
                                  {campo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {testResults.resultados.testes.validacao_campos.metadata_agregado && (
                          <div className="mt-2">
                            <p className="font-medium text-xs mb-1">📊 Metadados:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                              {JSON.stringify(testResults.resultados.testes.validacao_campos.metadata_agregado, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lotes Ativos */}
                {testResults.resultados.testes.lotes_ativos && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lotes Ativos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Caixa 2:</p>
                          {testResults.resultados.testes.lotes_ativos.caixa2 ? (
                            <Badge variant="default">
                              {testResults.resultados.testes.lotes_ativos.caixa2.codigo}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Vazia</Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Caixa 6:</p>
                          {testResults.resultados.testes.lotes_ativos.caixa6 ? (
                            <Badge variant="default">
                              {testResults.resultados.testes.lotes_ativos.caixa6.codigo}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Vazia</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        {testResults.resultados.testes.lotes_ativos.pode_coletar_dados ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Pode coletar dados IoT</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span>Sem lotes para coletar dados</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {testResults?.error && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg">Erro na Execução</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-destructive/10 p-3 rounded overflow-auto">
                {testResults.error}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
