import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import heroBg from '@/assets/hero-bg.jpg';
import { 
  Activity, 
  Waves, 
  FileText, 
  MapPin, 
  Shield, 
  Zap,
  ChevronRight,
  Play,
  Building2,
  User
} from 'lucide-react';


const features = [
  {
    icon: Waves,
    title: 'Sound Analysis',
    description: 'Advanced AI algorithms analyze mechanical sounds to detect anomalies in fans, pumps, and engines.',
  },
  {
    icon: FileText,
    title: 'PDF Reports',
    description: 'Generate comprehensive diagnostic reports with confidence scores and detailed recommendations.',
  },
  {
    icon: MapPin,
    title: 'Find Technicians',
    description: 'Locate certified service providers near you with our interactive map and booking system.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your audio data is encrypted and processed securely. We never share your information.',
  },
  {
    icon: Zap,
    title: 'Real-time Results',
    description: 'Get instant analysis results with time-series graphs and prediction confidence metrics.',
  },
  {
    icon: Activity,
    title: 'Multi-device Support',
    description: 'Analyze sounds from laptops, servers, vehicles, pumps, and industrial equipment.',
  },
];


export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="accent">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
        
        {/* Animated waveform background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="flex items-end gap-1 h-64">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 bg-accent rounded-full"
                animate={{
                  height: [20, Math.random() * 200 + 50, 20],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>

        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-6">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Sound Diagnostics</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Detect Machine Faults
              <br />
              <span className="gradient-text">Before They Happen</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Upload audio recordings of your mechanical equipment and let our AI analyze 
              sounds to identify normal or abnormal behavior with detailed diagnostic reports.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button variant="hero" size="xl">
                  Start Free Analysis
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Powerful Features for Sound Diagnostics
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to analyze, diagnose, and maintain your mechanical equipment.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="glass-card rounded-xl p-6 hover:shadow-card-hover transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Choose Your Account Type
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're an individual user or a service provider, we have the right plan for you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              className="glass-card rounded-2xl p-8 relative overflow-hidden group hover:shadow-card-hover transition-all duration-300"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <User className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Normal User</h3>
                <p className="text-muted-foreground mb-6">
                  Free access to sound analysis, waveform visualization, and PDF report generation 
                  for personal equipment diagnostics.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Upload audio recordings', 'View analysis results', 'Download PDF reports', 'Find nearby technicians'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="w-5 h-5 bg-success/10 rounded-full flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-success" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register?type=normal">
                  <Button variant="outline" className="w-full">Get Started Free</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              className="glass-card rounded-2xl p-8 relative overflow-hidden group border-accent/30 hover:shadow-card-hover transition-all duration-300"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute top-4 right-4 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Pro
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Company / Technician</h3>
                <p className="text-muted-foreground mb-6">
                  List your services on our platform, receive repair requests, and connect 
                  with customers looking for expert maintenance.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Appear on service map', 'Receive repair requests', 'Chat with customers', 'Schedule appointments'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="w-5 h-5 bg-success/10 rounded-full flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-success" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register?type=company">
                  <Button variant="accent" className="w-full">Register Company</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-primary-foreground mb-4">
              Ready to Analyze Your Equipment?
            </h2>
            <p className="text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust PERA-SAM for early fault detection and 
              preventive maintenance.
            </p>
            <Link to="/register">
              <Button 
                size="xl" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow"
              >
                Get Started Now
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 PERA-SAM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
