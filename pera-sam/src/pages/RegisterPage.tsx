import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { User, Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const normalUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  age: z.string().min(1, 'Age is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const companyUserSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  technicianName: z.string().min(2, 'Technician name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Primary contact is required'),
  phone2: z.string().optional(),
  serviceCategories: z.array(z.string()).min(1, 'Select at least one service category'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type NormalUserForm = z.infer<typeof normalUserSchema>;
type CompanyUserForm = z.infer<typeof companyUserSchema>;

const serviceCategories = [
  { id: 'laptop', label: 'Laptop/PC Fans' },
  { id: 'server', label: 'Server Equipment' },
  { id: 'pump', label: 'Pumps & Pipelines' },
  { id: 'vehicle', label: 'Vehicle Engines' },
  { id: 'hvac', label: 'HVAC Systems' },
  { id: 'industrial', label: 'Industrial Machinery' },
];

export const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [userType, setUserType] = useState<'normal' | 'company'>(
    (searchParams.get('type') as 'normal' | 'company') || 'normal'
  );

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'normal' || type === 'company') {
      setUserType(type);
    }
  }, [searchParams]);

  const [showPassword, setShowPassword] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const normalForm = useForm<NormalUserForm>({
    resolver: zodResolver(normalUserSchema),
  });

  const companyForm = useForm<CompanyUserForm>({
    resolver: zodResolver(companyUserSchema),
  });

  const handleNormalSubmit = async (data: NormalUserForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'normal',
        age: parseInt(data.age),
        address: data.address,
        phone: data.phone,
      });
      toast.success('Account created successfully!');
      navigate('/welcome');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCompanySubmit = async (data: CompanyUserForm) => {
    try {
      // Fetch current location for the company
      let location_lat: number | undefined;
      let location_lng: number | undefined;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location_lat = position.coords.latitude;
        location_lng = position.coords.longitude;
      } catch (err) {
        console.warn('Geolocation failed, registering without specific coordinates', err);
        // Fallback to default Peradeniya coordinates if geocoding/location fails
        location_lat = 7.2525;
        location_lng = 80.5925;
      }

      await registerUser({
        email: data.email,
        password: data.password,
        role: 'company',
        name: data.companyName,
        companyName: data.companyName,
        technicianName: data.technicianName,
        address: data.address,
        serviceCategories: selectedCategories,
        contactNumbers: [data.phone, data.phone2].filter(Boolean) as string[],
        location_lat,
        location_lng,
      });
      toast.success('Company account created successfully!');
      navigate('/welcome');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(errorMessage);
    }
  };

  const toggleCategory = (id: string) => {
    const nextCategories = selectedCategories.includes(id)
      ? selectedCategories.filter(c => c !== id)
      : [...selectedCategories, id];

    setSelectedCategories(nextCategories);
    companyForm.setValue('serviceCategories', nextCategories, {
      shouldValidate: true,
      shouldDirty: true,
    });
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
              Unlock the Power
              <br />
              <span className="text-accent">of Precision Sound.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed">
              Experience the next generation of sound analysis. Our ML-driven engine detects
              faults with best accuracy.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="h-px w-12 bg-white/20" />
          <p className="text-white/40 text-sm uppercase tracking-widest">
            Trusted by Engineering Teams Globally
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
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

          <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground mb-8">
            Choose your account type to get started
          </p>

          {/* Account Type Toggle */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setUserType('normal')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${userType === 'normal'
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
                }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${userType === 'normal' ? 'text-accent' : 'text-muted-foreground'}`} />
              <p className={`text-sm font-medium ${userType === 'normal' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Normal User
              </p>
            </button>
            <button
              onClick={() => setUserType('company')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${userType === 'company'
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
                }`}
            >
              <Building2 className={`h-6 w-6 mx-auto mb-2 ${userType === 'company' ? 'text-accent' : 'text-muted-foreground'}`} />
              <p className={`text-sm font-medium ${userType === 'company' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Company
              </p>
            </button>
          </div>

          {/* Normal User Form */}
          {userType === 'normal' && (
            <form onSubmit={normalForm.handleSubmit(handleNormalSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Bhagya Karunanayake" {...normalForm.register('name')} />
                {normalForm.formState.errors.name && (
                  <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="invictus2026@gmail.com" {...normalForm.register('email')} />
                {normalForm.formState.errors.email && (
                  <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" placeholder="23" {...normalForm.register('age')} />
                  {normalForm.formState.errors.age && (
                    <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.age.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+94 xx xxx xxxx" {...normalForm.register('phone')} />
                  {normalForm.formState.errors.phone && (
                    <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Faculty of Engineering, University of Peradeniya." {...normalForm.register('address')} />
                {normalForm.formState.errors.address && (
                  <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.address.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...normalForm.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {normalForm.formState.errors.password && (
                  <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...normalForm.register('confirmPassword')}
                />
                {normalForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-sm mt-1">{normalForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          )}

          {/* Company User Form */}
          {userType === 'company' && (
            <form onSubmit={companyForm.handleSubmit(handleCompanySubmit)} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company/Service Station Name</Label>
                <Input id="companyName" placeholder="Invictus" {...companyForm.register('companyName')} />
                {companyForm.formState.errors.companyName && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.companyName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="technicianName">Technician Name</Label>
                <Input id="technicianName" placeholder="Dileka Sandaruwan" {...companyForm.register('technicianName')} />
                {companyForm.formState.errors.technicianName && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.technicianName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="companyEmail">Email</Label>
                <Input id="companyEmail" type="email" placeholder="invictus2026@gmail.com" {...companyForm.register('email')} />
                {companyForm.formState.errors.email && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="companyAddress">Address</Label>
                <Input id="companyAddress" placeholder="No:x Street, City, State" {...companyForm.register('address')} />
                {companyForm.formState.errors.address && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyPhone">Primary Contact</Label>
                  <Input id="companyPhone" placeholder="+94 xx xxx xxxx" {...companyForm.register('phone')} />
                  {companyForm.formState.errors.phone && (
                    <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone2">Secondary Contact</Label>
                  <Input id="phone2" placeholder="+94 xx xxx xxxx" {...companyForm.register('phone2')} />
                </div>
              </div>

              <div>
                <Label>Service Categories</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {serviceCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${selectedCategories.includes(category.id)
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/50'
                        }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                {companyForm.formState.errors.serviceCategories && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.serviceCategories.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="companyPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="companyPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...companyForm.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {companyForm.formState.errors.password && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="companyConfirmPassword">Confirm Password</Label>
                <Input
                  id="companyConfirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...companyForm.register('confirmPassword')}
                />
                {companyForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-sm mt-1">{companyForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Company'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Demo credentials: user@demo.com / company@demo.com (password: demo123)
          </p>
        </motion.div>
      </div>
    </div>
  );
};
