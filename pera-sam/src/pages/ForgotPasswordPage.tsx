import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, isLoading } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
      toast.success('Reset link sent to your email!');
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
          {!isSubmitted ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Forgot Password?</h2>
              <p className="text-muted-foreground text-center mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" variant="accent" className="w-full h-12 text-md font-bold" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Check your email</h2>
              <p className="text-muted-foreground mb-8">
                We've sent a password reset link to your email address. Please check your inbox (and spam folder).
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Return to Login</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
