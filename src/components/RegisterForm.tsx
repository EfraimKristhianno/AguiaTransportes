import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  name: z.string().trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
  email: z.string().trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(72, 'Senha muito longa'),
});

interface RegisterFormProps {
  onToggleMode: () => void;
}

const RegisterForm = ({ onToggleMode }: RegisterFormProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const { toast } = useToast();

  const validateForm = () => {
    try {
      registerSchema.parse({ name, email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { name?: string; email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as 'name' | 'email' | 'password'] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      'user_already_exists': 'Este email já está cadastrado.',
      'email_address_invalid': 'Email inválido.',
      'weak_password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
      'over_email_send_rate_limit': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      'email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      'too_many_requests': 'Muitas tentativas. Aguarde alguns minutos.',
    };
    
    // Check for partial matches
    for (const [key, message] of Object.entries(errorMessages)) {
      if (errorCode.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
    
    return 'Erro ao criar conta. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const errorMessage = getErrorMessage(error.message);
        toast({
          variant: 'destructive',
          title: 'Erro ao criar conta',
          description: errorMessage,
        });
      } else if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Email já cadastrado',
            description: 'Este email já está em uso. Tente fazer login.',
          });
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar o cadastro.',
          });
          onToggleMode();
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
        <p className="mt-2 text-muted-foreground">
          Preencha os dados para se cadastrar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <div className="relative">
            <User className="input-icon h-5 w-5" />
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
              required
            />
          </div>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="input-icon h-5 w-5" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              required
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="input-icon h-5 w-5" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
              minLength={6}
              required
            />
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          className="btn-gradient w-full text-primary-foreground shadow-[var(--shadow-button)] hover:opacity-90"
          disabled={loading}
        >
          {loading ? 'Criando...' : 'Criar conta'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="font-medium text-primary hover:underline"
        >
          Entrar agora
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
