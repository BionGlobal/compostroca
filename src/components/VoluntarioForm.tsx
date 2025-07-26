import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { Voluntario } from '@/hooks/useVoluntarios';
import { validateCPF, formatCPF, sanitizeInput, validateEmail, validatePhone, formatPhone, checkRateLimit } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const voluntarioSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .transform(sanitizeInput),
  cpf: z.string()
    .refine(validateCPF, 'CPF inválido'),
  email: z.string()
    .refine(validateEmail, 'Email inválido')
    .transform(sanitizeInput),
  telefone: z.string()
    .refine(validatePhone, 'Telefone inválido'),
  endereco: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .transform(sanitizeInput),
  numero_balde: z.number().min(1).max(30),
  foto_url: z.string().optional(),
});

type VoluntarioFormData = z.infer<typeof voluntarioSchema>;

interface VoluntarioFormProps {
  voluntario?: Voluntario;
  onSubmit: (data: VoluntarioFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const VoluntarioForm: React.FC<VoluntarioFormProps> = ({
  voluntario,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<VoluntarioFormData>({
    resolver: zodResolver(voluntarioSchema),
    defaultValues: voluntario ? {
      nome: voluntario.nome,
      cpf: voluntario.cpf,
      email: voluntario.email,
      telefone: voluntario.telefone,
      endereco: voluntario.endereco,
      numero_balde: voluntario.numero_balde,
      foto_url: voluntario.foto_url || '',
    } : {
      numero_balde: 1,
    },
  });

  const fotoUrl = watch('foto_url');

  const handleFormSubmit = async (data: VoluntarioFormData) => {
    // Rate limiting check
    if (!checkRateLimit('volunteer-form', 3, 60000)) {
      toast({
        title: "Muitas tentativas",
        description: "Aguarde um momento antes de tentar novamente",
        variant: "destructive",
      });
      return;
    }

    // Format data before submission
    const formattedData = {
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      telefone: data.telefone.replace(/\D/g, ''),
    };

    await onSubmit(formattedData);
  };

  const formatCPF = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 11);
  };

  const formatTelefone = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 11);
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erro",
        description: "Imagem muito grande. Máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voluntarios-fotos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voluntarios-fotos')
        .getPublicUrl(data.path);

      setValue('foto_url', publicUrl);
      
      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso!",
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar a foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = () => {
    // Implementar captura via câmera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {voluntario ? 'Editar Voluntário' : 'Cadastrar Voluntário'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={fotoUrl} />
              <AvatarFallback className="text-lg">
                {voluntario?.nome ? getInitials(voluntario.nome) : '+'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCameraCapture}
                disabled={uploading}
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploading ? 'Enviando...' : 'Câmera'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImageUpload}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Enviando...' : 'Galeria'}
              </Button>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              {...register('nome')}
              placeholder="Digite o nome completo"
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              {...register('cpf', {
                onChange: (e) => {
                  e.target.value = formatCPF(e.target.value);
                },
              })}
              placeholder="00000000000"
              maxLength={11}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              {...register('telefone', {
                onChange: (e) => {
                  e.target.value = formatTelefone(e.target.value);
                },
              })}
              placeholder="11999999999"
              maxLength={11}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço Completo *</Label>
            <Input
              id="endereco"
              {...register('endereco')}
              placeholder="Rua, número, bairro, cidade"
            />
            {errors.endereco && (
              <p className="text-sm text-destructive">{errors.endereco.message}</p>
            )}
          </div>

          {/* Número do Balde */}
          <div className="space-y-2">
            <Label htmlFor="numero_balde">Número do Balde (1-30) *</Label>
            <Input
              id="numero_balde"
              type="number"
              min="1"
              max="30"
              {...register('numero_balde', { valueAsNumber: true })}
            />
            {errors.numero_balde && (
              <p className="text-sm text-destructive">{errors.numero_balde.message}</p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Salvando...' : voluntario ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};