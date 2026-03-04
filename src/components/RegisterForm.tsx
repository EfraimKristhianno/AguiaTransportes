import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
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
    const normalizedError = errorCode.toLowerCase();
    
    // Exact matches first (more specific)
    if (normalizedError === 'user_already_exists' || normalizedError.includes('user already registered')) {
      return 'Este email já está cadastrado. Tente fazer login.';
    }
    
    if (normalizedError.includes('email_address_invalid') || normalizedError.includes('invalid email')) {
      return 'Email inválido.';
    }
    
    if (normalizedError.includes('weak_password')) {
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    }
    
    if (normalizedError.includes('rate_limit') || normalizedError.includes('rate limit') || normalizedError.includes('too_many_requests')) {
      return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
    }
    
    console.error('Unhandled auth error:', errorCode);
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
          // Create user profile in users table
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              auth_id: data.user.id,
              name: name.trim(),
              email: email.trim().toLowerCase(),
            });

          if (profileError) {
            console.error('Error creating user profile:', profileError);
          }

          // Check if this is the first user and assign admin role
          const { count, error: countError } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true });

          if (!countError && count === 0) {
            // First user gets admin role
            await supabase
              .from('user_roles')
              .insert({ user_id: data.user.id, role: 'admin' });
            
            toast({
              title: 'Conta de Administrador criada!',
              description: 'Você é o primeiro usuário e foi definido como Administrador.',
            });
          } else {
            // Other users get cliente role by default
            await supabase
              .from('user_roles')
              .insert({ user_id: data.user.id, role: 'cliente' });
            
            toast({
              title: 'Conta criada!',
              description: 'Sua conta foi criada com sucesso.',
            });
          }
          
          onToggleMode();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
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
            <PasswordInput
              id="password"
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
