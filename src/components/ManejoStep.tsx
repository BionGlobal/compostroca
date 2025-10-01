import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ManejoCamera } from './ManejoCamera';
import { 
  ArrowRight, 
  Package, 
  Scale, 
  Camera, 
  CheckCircle,
  Trash2
} from 'lucide-react';
import { ManejoStep as ManejoStepType } from '@/hooks/useManejoSemanal';

interface ManejoStepProps {
  etapa: ManejoStepType;
  etapaIndex: number;
  totalEtapas: number;
  onUpdateEtapa: (dados: Partial<ManejoStepType>) => void;
  onUploadFoto: (arquivo: File, etapaId: string) => Promise<string>;
  uploading: boolean;
}

export const ManejoStep: React.FC<ManejoStepProps> = ({
  etapa,
  etapaIndex,
  totalEtapas,
  onUpdateEtapa,
  onUploadFoto,
  uploading
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [pesoNovo, setPesoNovo] = useState(etapa.pesoNovo?.toString() || '');
  const [observacoes, setObservacoes] = useState(etapa.observacoes || '');

  const handlePhotoCapture = async (file: File) => {
    try {
      const fotoUrl = await onUploadFoto(file, etapa.id);
      onUpdateEtapa({ foto: fotoUrl });
      setShowCamera(false);
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
    }
  };

  const handlePesoChange = (valor: string) => {
    setPesoNovo(valor);
    const peso = parseFloat(valor);
    if (!isNaN(peso)) {
      onUpdateEtapa({ pesoNovo: peso });
    }
  };

  const handleObservacoesChange = (valor: string) => {
    setObservacoes(valor);
    onUpdateEtapa({ observacoes: valor });
  };

  const calcularPesoEsperado = () => {
    // Redução esperada de 3,54% por semana
    return etapa.pesoAnterior * 0.9646;
  };

  const getStepTitle = () => {
    if (etapa.tipo === 'finalizacao') {
      return `Finalizar Caixa ${etapa.caixaOrigem}`;
    }
    return `Transferir Caixa ${etapa.caixaOrigem} → ${etapa.caixaDestino}`;
  };

  const getStepDescription = () => {
    if (etapa.tipo === 'finalizacao') {
      return `Retire o composto pronto da caixa ${etapa.caixaOrigem} para distribuição`;
    }
    return `Transfira o conteúdo da caixa ${etapa.caixaOrigem} para a caixa ${etapa.caixaDestino}`;
  };

  if (showCamera) {
    return (
      <ManejoCamera
        title={getStepTitle()}
        description={getStepDescription()}
        onPhotoCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  const pesoEsperado = calcularPesoEsperado();
  const pesoAtual = pesoNovo ? parseFloat(pesoNovo) : null;
  const temFoto = !!etapa.foto;
  const podeAvancar = temFoto && pesoAtual !== null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            Etapa {etapaIndex + 1} de {totalEtapas}
          </Badge>
          {podeAvancar && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completa
            </Badge>
          )}
        </div>
        
        <CardTitle className="flex items-center gap-2">
          {etapa.tipo === 'finalizacao' ? (
            <Trash2 className="h-5 w-5 text-orange-500" />
          ) : (
            <ArrowRight className="h-5 w-5 text-blue-500" />
          )}
          {getStepTitle()}
        </CardTitle>
        
        <p className="text-sm text-muted-foreground">
          {getStepDescription()}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações do Lote */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Lote:</span>
            <Badge variant="outline">{etapa.loteNome}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Peso anterior:</span>
            <span className="text-sm">{etapa.pesoAnterior.toFixed(1)} kg</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Peso esperado:</span>
            <span className="text-sm text-muted-foreground">
              {pesoEsperado.toFixed(1)} kg
            </span>
          </div>
        </div>

        {/* Foto */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Foto da operação *
          </label>
          
          {etapa.foto ? (
            <div className="relative">
              <img
                src={etapa.foto}
                alt="Foto da operação"
                className="w-full rounded-lg border"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
              <Button
                onClick={() => setShowCamera(true)}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowCamera(true)}
              variant="outline"
              className="w-full h-24 border-dashed"
              disabled={uploading}
            >
              <Camera className="h-6 w-6 mr-2" />
              {uploading ? 'Enviando...' : 'Capturar Foto'}
            </Button>
          )}
        </div>

        {/* Peso Novo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Peso atual (kg) *
          </label>
          <div className="relative">
            <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.1"
              min="0"
              value={pesoNovo}
              onChange={(e) => handlePesoChange(e.target.value)}
              placeholder={`Ex: ${pesoEsperado.toFixed(1)}`}
              className="pl-10"
            />
          </div>
          
          {pesoAtual !== null && (
            <div className="text-xs">
              <span className={`font-medium ${
                Math.abs(pesoAtual - pesoEsperado) / pesoEsperado > 0.1 
                  ? 'text-orange-500' 
                  : 'text-green-500'
              }`}>
                {pesoAtual > pesoEsperado ? '+' : ''}
                {((pesoAtual - pesoEsperado) / pesoEsperado * 100).toFixed(1)}%
              </span>
              <span className="text-muted-foreground"> em relação ao esperado</span>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Observações
          </label>
          <Textarea
            value={observacoes}
            onChange={(e) => handleObservacoesChange(e.target.value)}
            placeholder="Adicione observações sobre esta operação..."
            rows={3}
          />
        </div>

        {/* Status */}
        {!podeAvancar && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Para avançar, você precisa:
            </p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              {!temFoto && <li>• Capturar uma foto da operação</li>}
              {pesoAtual === null && <li>• Informar o peso atual</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};