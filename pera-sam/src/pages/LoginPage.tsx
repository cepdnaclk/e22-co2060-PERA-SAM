import { useState } from 'react';
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
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/welcome');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-accent/20 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
                scale: Math.random() * 1 + 0.5
              }}
              animate={{
                y: [null, Math.random() * 100 + "%"],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
              }}
            />
          ))}

          {/* Central Pulse Ring Effect */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/5"
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
            style={{ width: '400px', height: '400px' }}
          />

          {/* Moving Sound Waves */}
          <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end gap-1 px-4 opacity-10">
            {[...Array(60)].map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-accent rounded-t-full"
                animate={{ height: [20, Math.random() * 150 + 40, 20] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="bg-accent p-2 rounded-xl group-hover:scale-110 transition-transform">
              <Logo size="lg" showText={false} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                PERA<span className="text-accent">-</span>SAM
              </h1>
              <p className="text-xs text-accent font-mono tracking-widest uppercase opacity-70">Acoustic Intelligence</p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              Welcome Back
              <br />
              <span className="text-accent">to Precision.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Sign in to access your dashboard and continue analyzing
              mechanical sounds with ML-powered precision.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="h-px w-12 bg-white/20" />
          <p className="text-white/40 text-sm uppercase tracking-widest">
            Acoustic Diagnostics for Industry 4.0
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-3">
              <Logo size="md" showText={false} />
              <div>
                <h1 className="text-xl font-bold text-foreground">PERA-SAM</h1>
                <p className="text-xs text-muted-foreground">Sound Analysis Manager</p>
              </div>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In</h1>
          <p className="text-muted-foreground mb-8">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="xxxx@gmail.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="rounded border-border" />
                Remember me
              </label>
              <a href="#" className="text-sm text-accent hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:underline">Sign up</Link>
          </p>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              New to PERA-SAM? Create an account to start analyzing mechanical sounds with ML-powered diagnostics.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
