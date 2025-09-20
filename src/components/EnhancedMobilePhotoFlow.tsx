import React, { useState } from 'react';
import { SimpleCameraCapture } from '@/components/SimpleCameraCapture';
import { EntregaConfirmationModal } from '@/components/EntregaConfirmationModal';
import { useEntregaFotos } from '@/hooks/useEntregaFotos';
import { useToast } from '@/hooks/use-toast';

interface EnhancedMobilePhotoFlowProps {
  entregaId: string;
  onComplete: () => void;
  onCancel: () => void;
  entregaData: {
    voluntarioNome: string;
    numeroComposteira: number;
    peso: number;
    qualidadeResiduo: number;
  };
}

const FOTO_STEPS = [
  {
    tipo: 'conteudo',
    title: 'Foto do Conteúdo',
    description: 'Fotografe o resíduo orgânico que está sendo entregue'
  },
  {
    tipo: 'pesagem',
    title: 'Foto da Pesagem',
    description: 'Fotografe a balança mostrando o peso do resíduo'
  },
  {
    tipo: 'destino',
    title: 'Foto do Destino',
    description: 'Fotografe a composteira onde o resíduo foi depositado'
  }
] as const;

export const EnhancedMobilePhotoFlow: React.FC<EnhancedMobilePhotoFlowProps> = ({
  entregaId,
  onComplete,
  onCancel,
  entregaData
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const { uploadFoto, uploading } = useEntregaFotos(entregaId);
  const { toast } = useToast();

  const currentStepInfo = FOTO_STEPS[currentStep];

  const handlePhotoCapture = async (dataUrl: string, metadata: any) => {
    try {
      // Converter dataURL para File
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${currentStepInfo.tipo}-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Upload da foto
      await uploadFoto(file, currentStepInfo.tipo, metadata);
      
      // Salvar para preview
      setCapturedPhotos(prev => [...prev, dataUrl]);
      
      // Próximo passo ou finalizar
      if (currentStep < FOTO_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        toast({
          title: 'Foto salva!',
          description: `${currentStepInfo.title} capturada com sucesso`,
        });
      } else {
        // Todas as fotos capturadas
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar a foto. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const handleConfirmDelivery = () => {
    onComplete();
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    // Voltar para o último step para eventual refoto
    setCurrentStep(FOTO_STEPS.length - 1);
  };

  const handleCancelFlow = () => {
    if (capturedPhotos.length > 0) {
      // Confirmar se realmente quer cancelar
      if (window.confirm('Tem certeza que deseja cancelar? As fotos capturadas serão perdidas.')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  if (showConfirmation) {
    return (
      <EntregaConfirmationModal
        isOpen={true}
        onConfirm={handleConfirmDelivery}
        onCancel={handleCancelConfirmation}
        entregaData={{
          ...entregaData,
          numeroBalde: entregaData.numeroComposteira,
          fotos: capturedPhotos.map((dataUrl, index) => ({
            tipo: FOTO_STEPS[index]?.tipo || 'unknown',
            preview: dataUrl
          }))
        }}
        isLoading={uploading}
      />
    );
  }

  return (
    <SimpleCameraCapture
      onPhotoCapture={handlePhotoCapture}
      onCancel={handleCancelFlow}
      currentStep={currentStep + 1}
      totalSteps={FOTO_STEPS.length}
      instruction={currentStepInfo}
      className="fixed inset-0 z-50"
    />
  );
};