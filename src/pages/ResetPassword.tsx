 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { PasswordInput } from '@/components/ui/password-input';
 import { Label } from '@/components/ui/label';
 import { useToast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 import { z } from 'zod';
 import logoAguia from '@/assets/logo-aguia.png';
 
 const passwordSchema = z.object({
   password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa'),
   confirmPassword: z.string(),
 }).refine((data) => data.password === data.confirmPassword, {
   message: 'As senhas não coincidem',
   path: ['confirmPassword'],
 });
 
 const ResetPassword = () => {
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true;
        setSessionReady(true);
        clearTimeout(timeout);
      }
    });

    // Also check if already has session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !settled) {
        settled = true;
        setSessionReady(true);
        clearTimeout(timeout);
      }
    });

    // Timeout - if no session after 5s, redirect
    timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        toast({
          variant: 'destructive',
          title: 'Link inválido ou expirado',
          description: 'Solicite um novo link de recuperação de senha.',
        });
        navigate('/');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, toast]);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     try {
       passwordSchema.parse({ password, confirmPassword });
       setErrors({});
     } catch (error) {
       if (error instanceof z.ZodError) {
         const fieldErrors: { password?: string; confirmPassword?: string } = {};
         error.errors.forEach((err) => {
           if (err.path[0]) {
             fieldErrors[err.path[0] as 'password' | 'confirmPassword'] = err.message;
           }
         });
         setErrors(fieldErrors);
       }
       return;
     }
 
     setLoading(true);
 
     try {
       const { error } = await supabase.auth.updateUser({ password });
 
       if (error) {
         toast({
           variant: 'destructive',
           title: 'Erro',
           description: error.message,
         });
       } else {
         setSuccess(true);
         toast({
           title: 'Senha atualizada',
           description: 'Sua senha foi redefinida com sucesso.',
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
 
  if (!sessionReady && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <img src={logoAguia} alt="Logo" className="h-16 w-auto" />
          </div>
          <div className="rounded-xl border border-border bg-card p-8">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando link de recuperação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background p-4">
         <div className="w-full max-w-md text-center">
           <div className="mb-6 flex justify-center">
             <img src={logoAguia} alt="Logo" className="h-16 w-auto" />
           </div>
           <div className="rounded-xl border border-border bg-card p-8">
             <CheckCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
             <h2 className="text-2xl font-bold text-foreground mb-2">
               Senha redefinida!
             </h2>
             <p className="text-muted-foreground mb-6">
               Sua senha foi atualizada com sucesso. Você já pode fazer login.
             </p>
             <Button
               onClick={() => navigate('/')}
               className="w-full"
             >
               Ir para o login
               <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
         <div className="mb-6 flex justify-center">
           <img src={logoAguia} alt="Logo" className="h-16 w-auto" />
         </div>
         
         <div className="rounded-xl border border-border bg-card p-8">
           <div className="mb-8 text-center">
             <h2 className="text-2xl font-bold text-foreground">Nova senha</h2>
             <p className="mt-2 text-muted-foreground">
               Digite sua nova senha abaixo
             </p>
           </div>
 
           <form onSubmit={handleSubmit} className="space-y-5">
             <div className="space-y-2">
               <Label htmlFor="password">Nova senha</Label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="password"
                    placeholder="Mínimo 6 caracteres"
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
 
             <div className="space-y-2">
               <Label htmlFor="confirmPassword">Confirmar senha</Label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={`pl-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                   required
                 />
               </div>
               {errors.confirmPassword && (
                 <p className="text-sm text-destructive">{errors.confirmPassword}</p>
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
                   Atualizando...
                 </>
               ) : (
                 <>
                   Redefinir senha
                   <ArrowRight className="ml-2 h-4 w-4" />
                 </>
               )}
             </Button>
           </form>
         </div>
       </div>
     </div>
   );
 };
 
 export default ResetPassword;