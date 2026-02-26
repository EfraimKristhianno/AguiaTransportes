import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa'),
});

interface LoginFormProps {
  onToggleMode: () => void;
}

const LoginForm = ({ onToggleMode }: LoginFormProps) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; password?: string; email?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = () => {
    try {
      loginSchema.parse({ name, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { name?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as 'name' | 'password'] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      'invalid_credentials': 'Nome ou senha incorretos.',
      'user_not_found': 'Usuário não encontrado.',
      'too_many_requests': 'Muitas tentativas. Aguarde alguns minutos.',
    };
    return errorMessages[errorCode] || 'Nome ou senha incorretos.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('login-by-name', {
        body: { name: name.trim(), password },
      });

      if (error) {
        // Try to extract the error body from FunctionsHttpError
        let errorCode = 'invalid_credentials';
        try {
          const errorBody = await (error as any).context?.json?.();
          if (errorBody?.error) errorCode = errorBody.error;
        } catch {}
        const errorMessage = getErrorMessage(errorCode);
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: errorMessage,
        });
      } else if (!data?.session) {
        const errorMessage = getErrorMessage(data?.error || 'invalid_credentials');
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: errorMessage,
        });
      } else {
        await supabase.auth.setSession(data.session);
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/dashboard');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      z.string().email('Email inválido').parse(resetEmail.trim());
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0]?.message });
      }
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error.message,
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: 'Email enviado',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
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

  if (forgotPasswordMode) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">Recuperar senha</h2>
          <p className="mt-2 text-muted-foreground">
            {resetEmailSent
              ? 'Verifique seu email para continuar'
              : 'Digite seu email para receber o link de recuperação'}
          </p>
        </div>

        {resetEmailSent ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-sm text-foreground">
                Enviamos um link de recuperação para <strong>{resetEmail}</strong>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setForgotPasswordMode(false);
                setResetEmailSent(false);
              }}
            >
              Voltar ao login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="input-icon h-5 w-5" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (errors.email) setErrors({});
                  }}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <Button
              type="submit"
              className="btn-gradient w-full text-primary-foreground shadow-[var(--shadow-button)] hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setForgotPasswordMode(false)}
            >
              Voltar ao login
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
        <p className="mt-2 text-muted-foreground">
          Entre com suas credenciais para acessar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Usuário</Label>
          <div className="relative">
            <User className="input-icon h-5 w-5" />
            <Input
              id="name"
              type="text"
              placeholder="Seu usuário"
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
          {loading ? 'Entrando...' : 'Entrar'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setForgotPasswordMode(true)}
          className="text-sm text-primary hover:underline"
        >
          Esqueceu sua senha?
        </button>
      </div>

    </div>
  );
};

export default LoginForm;
