import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type PageState = 'verifying' | 'ready' | 'invalid' | 'success';

export const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [pageState, setPageState] = useState<PageState>('verifying');
  const { updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Supabase appends the recovery tokens as a URL hash: #access_token=...&type=recovery
    // We listen for the PASSWORD_RECOVERY auth event which fires when these tokens are
    // automatically consumed by the Supabase client on page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });

    // Also handle the case where the hash is already present when this component mounts
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      // The Supabase client will detect the hash and fire PASSWORD_RECOVERY — give it a moment
      const timer = setTimeout(() => {
        setPageState((current) => current === 'verifying' ? 'invalid' : current);
      }, 3000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    } else {
      // No recovery token at all — invalid link
      setPageState('invalid');
    }

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      await updatePassword(data.password);
      setPageState('success');
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex flex-col items-center gap-2 group">
            <div className="bg-accent p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-accent/20">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase mt-2">
              PERA<span className="text-accent">-</span>SAM
            </h1>
          </Link>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-border/50 shadow-2xl">
          {/* Verifying state */}
          {pageState === 'verifying' && (
            <div className="text-center py-4">
              <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Verifying link…</h2>
              <p className="text-muted-foreground text-sm">Please wait while we validate your reset link.</p>
            </div>
          )}

          {/* Invalid / expired token state */}
          {pageState === 'invalid' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Link invalid or expired</h2>
              <p className="text-muted-foreground mb-8">
                This password reset link is no longer valid. Links expire after 1 hour and can only be used once.
              </p>
              <Button asChild variant="accent" className="w-full mb-3">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Login</Link>
              </Button>
            </motion.div>
          )}

          {/* Ready to enter new password */}
          {pageState === 'ready' && (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Reset Password</h2>
              <p className="text-muted-foreground text-center mb-8">
                Pick a strong new password to secure your account.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10"
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full h-12 text-md font-bold" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Success state */}
          {pageState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Password reset complete!</h2>
              <p className="text-muted-foreground mb-8">
                Your password has been successfully updated. You will be redirected to the login page in a few seconds.
              </p>
              <Button asChild variant="accent" className="w-full">
                <Link to="/login">Login Now</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
