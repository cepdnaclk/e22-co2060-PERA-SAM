import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { BorderBeam } from '@/components/BorderBeam';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  User,
  Mail,
  Phone,
  QrCode,
  Github,
  Cpu,
  Globe,
  Database,
  Linkedin,
  UserCircle
} from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import supervisorImg from '@/assets/team/supervisor.png';
import techLeadImg from '@/assets/team/tech_lead.png';
import ceoImg from '@/assets/team/ceo.png';
import member2Img from '@/assets/team/member2.png';
import member3Img from '@/assets/team/member3.png';
import member4Img from '@/assets/team/member4.png';
import qrCodeImg from '@/assets/qr_code.png';
import heroBackground from '@/assets/hero-bg-industrial.png';
import ctaBackground from '@/assets/cta-bg.png';
import invictusBanner from '@/assets/invictus-banner.png';
import { enableGlobalCursorStyles } from 'react-resizable-panels';

// ─── Tech Stack for Marquee ──────────────────────────────────────────────────
const techItems = [
  { name: 'React', color: '#61DAFB', letter: '⚛' },
  { name: 'TypeScript', color: '#3178C6', letter: 'TS' },
  { name: 'JavaScript', color: '#F7DF1E', letter: 'JS' },
  { name: 'Python', color: '#FFD845', letter: '🐍' },
  { name: 'Supabase', color: '#3ECF8E', letter: '⚡' },
  { name: 'Azure', color: '#0078D4', letter: '☁' },
  { name: 'Docker', color: '#2496ED', letter: '🐳' },
  { name: 'Node.js', color: '#339933', letter: '⬡' },
  { name: 'FastAPI', color: '#009688', letter: '🚀' },
  { name: 'PostgreSQL', color: '#336791', letter: '🐘' },
  { name: 'Vite', color: '#646CFF', letter: '⚡' },
  { name: 'TailwindCSS', color: '#06B6D4', letter: '🌊' },
  { name: 'Git', color: '#F05032', letter: '⎇' },
  { name: 'Nginx', color: '#009900', letter: 'N' },
];
const marqueeItems = [...techItems, ...techItems, ...techItems];

// ─── Contact Section Component ───────────────────────────────────────────────
const ContactSection = () => {
  return (
    <section
      id="contact"
      className="py-24 px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsla(0, 0%, 0%, 0.00) 0%, hsla(0, 0%, 0%, 0.00) 100%)' }}
    >
      {/* ── MARQUEE STRIP: behind everything at z-0 ── */}
      <div
        className="absolute inset-0 flex items-center overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <motion.div
          className="flex items-center gap-10 whitespace-nowrap"
          style={{ width: 'max-content' }}
          animate={{ x: ['-33.333%', '0%'] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        >
          {marqueeItems.map((tech, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5"
              style={{ minWidth: 60, opacity: 1.00 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${tech.color}15`,
                  border: `1px solid ${tech.color}28`,
                  boxShadow: `0 0 14px ${tech.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tech.letter.length <= 2 ? 15 : 22,
                  fontWeight: 800,
                  color: tech.color,
                  fontFamily: 'monospace',
                }}
              >
                {tech.letter}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: tech.color, textTransform: 'uppercase' }}>
                {tech.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── MAIN CONTENT: above marquee ── */}
      <div className="container mx-auto relative" style={{ zIndex: 1 }}>
        {/* Section heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-foreground mb-4">Get In Touch</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions or need support? Our team is here to help you.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row items-end justify-center gap-14 max-w-5xl mx-auto">

          {/* ── LEFT: Invictus banner image ── */}
          <motion.div
            className="flex-shrink-0 flex items-center justify-center relative"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ zIndex: 2 }}
          >
            {/* Spinning ring + circle frame */}
            <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
              {/* Animated rotating gradient ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #06b6d4, #3ecf8e, #0078d4, #61dafb, #06b6d4)',
                  padding: 3,
                  borderRadius: '50%',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
              {/* Blur glow ring underneath */}
              <div
                className="absolute inset-0 rounded-full opacity-50 blur-md"
                style={{ background: 'conic-gradient(from 0deg, #06b6d4, #3ecf8e, #0078d4, #61dafb, #06b6d4)' }}
              />
              {/* White separator ring */}
              <div
                className="absolute rounded-full"
                style={{ inset: 3, background: 'hsl(220,20%,8%)', borderRadius: '50%' }}
              />
              {/* Image inside circle */}
              <div
                className="absolute overflow-hidden group"
                style={{ inset: 5, borderRadius: '50%' }}
              >
                <img
                  src={invictusBanner}
                  alt="Invictus – Future is here"
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
                  style={{ borderRadius: '50%' }}
                />
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Contact info – no box borders, tight spacing ── */}
          <motion.div
            className="flex flex-col gap-3 w-full lg:w-auto pt-12"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ zIndex: 2 }}
          >
            {/* Email */}
            <motion.a
              href="mailto:invictus2026sam@gmail.com"
              className="group flex items-center gap-4 py-2 transition-all duration-300"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(20,184,166,0.10)' }}>
                <Mail className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm">
                invictus2026sam@gmail.com
              </span>
            </motion.a>

            {/* Phone – both numbers in one row */}
            <motion.div
              className="group flex items-center gap-4 py-2"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(20,184,166,0.10)' }}>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <a href="tel:+94763263100" className="hover:text-foreground transition-colors duration-200">+94 76 326 3100</a>
                <span className="text-muted-foreground/30">|</span>
                <a href="tel:+94702618587" className="hover:text-foreground transition-colors duration-200">+94 70 261 8587</a>
              </div>
            </motion.div>

            {/* Location */}
            <motion.a
              href="https://eng.pdn.ac.lk/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 py-2 transition-all duration-300"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(20,184,166,0.10)' }}>
                <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm leading-relaxed">
                Faculty of Engineering, University of Peradeniya, Sri Lanka.
              </span>
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Word-Reveal Component (Antigravity-style smooth scroll reveal) ──────────────
const WordReveal = ({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(' ');
  return (
    <p ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 0.3em', lineHeight: 1.7 }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0px)' : 'translateY(10px)',
            transition: `opacity 0.45s ease ${delay + i * 0.045}s, transform 0.45s ease ${delay + i * 0.045}s`,
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── GlowCard: BorderBeam travelling-light border effect (kavithakanchana.me style) ──
const GlowCard = ({
  children,
  className = '',
  style = {},
  motionProps = {},
  beamDuration = 5,
  beamDelay = 0,
  beamSize = 80,
  beamReverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  motionProps?: Record<string, unknown>;
  beamDuration?: number;
  beamDelay?: number;
  beamSize?: number;
  beamReverse?: boolean;
}) => {
  return (
    <motion.div
      className={`glass-card relative overflow-hidden ${className}`}
      style={style}
      {...motionProps}
    >
      {children}
      <BorderBeam
        size={beamSize}
        duration={beamDuration}
        delay={beamDelay}
        colorFrom="hsl(217 91% 80%)"
        colorTo="hsl(246 80% 75%)"
        borderWidth={1.5}
        reverse={beamReverse}
      />
    </motion.div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Waves,
    title: 'Sound Analysis',
    description: 'Advanced ML algorithms analyze mechanical sounds to detect anomalies in fans, pumps, and engines.',
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
    description: 'Analyze sounds from industrial fans, pumps, valves, slide rails, and vehicle bearings.',
  },
];


// ─── Typewriter-Reveal Component (Scroll-triggered typewriter) ─────────────
const TypewriterReveal = ({ text, className = '', speed = 55 }: { text: string; className?: string; speed?: number }) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { displayedLines, done } = useTypewriter([text], speed, 0, inView);

  return (
    <h2 ref={ref} className={className}>
      <span>
        {displayedLines[0] ?? ''}
        {!done && inView && (
          <span
            className="inline-block w-[3px] h-[0.85em] ml-1 align-middle rounded-sm"
            style={{
              background: 'currentColor',
              animation: 'hero-blink 0.75s step-end infinite',
            }}
          />
        )}
      </span>
    </h2>
  );
};
// ─────────────────────────────────────────────────────────────────────────────



export const LandingPage = () => {
  const [activeSection, setActiveSection] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const heroLines = ['Detect Machine Faults', 'Before They Happen'];
  const { displayedLines, activeLine, done } = useTypewriter(heroLines, 55, 400);

  const paraText = 'Upload audio recordings of your mechanical equipment and let our Acoustic Intelligence analyze sounds to identify normal or abnormal behavior with detailed diagnostic reports.';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ['features', 'how-it-works', 'pricing', 'about', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }

      // If at the top, clear active section
      if (window.scrollY < 100) setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinkClasses = (id: string) => `
    font-medium transition-all duration-200 
    ${activeSection === id ? 'text-accent scale-105' : 'text-primary dark:text-white hover:text-accent'}
  `;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-md border-b border-border py-4' : 'bg-transparent py-6'
        }`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className={navLinkClasses('features')}>Features</a>
            <a href="#how-it-works" className={navLinkClasses('how-it-works')}>How it Works</a>
            <a href="#pricing" className={navLinkClasses('pricing')}>Pricing</a>
            <a href="#about" className={navLinkClasses('about')}>About Us</a>
            <a href="#contact" className={navLinkClasses('contact')}>Contact Us</a>
            <ThemeToggle />
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="default">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="default">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background Industrial Image with Technical Filter */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBackground}
            alt="Industrial Background"
            className="w-full h-full object-cover opacity-[0.6] scale-105 transition-all duration-1000 group-hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/90" />
        </div>

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
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary dark:text-white px-4 py-2 rounded-full mb-6 border border-accent/40 shadow-[0_0_10px_hsl(var(--accent)/0.25)] dark:shadow-[0_0_15px_hsl(var(--accent)/0.3)]">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">ML-Powered Sound Analysis Manager </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              {/* Line 1: plain foreground text */}
              <span>
                {displayedLines[0] ?? ''}
                {activeLine === 0 && !done && (
                  <span
                    className="inline-block w-[3px] h-[0.85em] ml-1 align-middle rounded-sm"
                    style={{
                      background: 'currentColor',
                      animation: 'hero-blink 0.75s step-end infinite',
                    }}
                  />
                )}
              </span>
              <br />
              {/* Line 2: dark blue gradient text */}
              <span className="bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                {displayedLines[1] ?? ''}
                {activeLine === 1 && !done && (
                  <span
                    className="inline-block w-[3px] h-[0.85em] ml-1 align-middle rounded-sm"
                    style={{
                      background: 'currentColor',
                      animation: 'hero-blink 0.75s step-end infinite',
                    }}
                  />
                )}
              </span>
            </h1>

            <motion.div
              className="bg-primary/10 px-5 py-3 rounded-xl mb-10 max-w-2xl mx-auto border border-accent/40 backdrop-blur-sm shadow-[0_0_15px_hsl(var(--accent)/0.25)] dark:shadow-[0_0_20px_hsl(var(--accent)/0.3)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <p className="text-sm text-primary dark:text-white font-medium" style={{ minHeight: '3rem', lineHeight: '1.6' }}>
                {paraText}
              </p>
            </motion.div>

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
              <GlowCard
                key={index}
                className="rounded-xl p-6 hover:shadow-card-hover transition-all duration-300"
                beamDelay={index * 0.8}
                beamDuration={5}
                motionProps={{
                  initial: { opacity: 0, y: 20 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true },
                  transition: { duration: 0.6, delay: index * 0.1 },
                }}
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <WordReveal
                  text={feature.description}
                  className="text-muted-foreground"
                  delay={index * 0.08}
                />
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              How PERA-SAM Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple 3-step process to diagnose your equipment using acoustic intelligence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {

                title: 'Record Sound',
                description: 'Capture the operational sound of your machinery using your smartphone or industrial microphone.',
                icon: Waves
              },
              {
                title: 'AI Analysis',
                description: 'Our advanced machine learning model analyze the acoustic signatures to identify patterns and anomalies.',
                icon: Activity
              },
              {
                title: 'Get Insights',
                description: 'Receive a detailed report with health scores, fault types, and maintenance recommendations.',
                icon: Shield
              },
            ].map((item, i) => (
              <GlowCard
                key={i}
                className="rounded-2xl p-8 text-center relative overflow-hidden group"
                beamReverse={i === 1}
                beamDelay={i * 1.2}
                motionProps={{
                  initial: { opacity: 0, y: 20 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true },
                  transition: { duration: 0.6, delay: i * 0.1 },
                }}
              >
                <div className="w-16 h-16 bg-accent/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <item.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <WordReveal
                  text={item.description}
                  className="text-muted-foreground"
                  delay={i * 0.1}
                />
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section / Pricing */}
      <section id="pricing" className="py-20 px-4">
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
            <GlowCard
              className="rounded-2xl p-8 relative overflow-hidden group hover:shadow-card-hover transition-all duration-300"
              motionProps={{
                initial: { opacity: 0, x: -20 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true },
                transition: { duration: 0.6 },
              }}
            >
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <User className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Normal User</h3>
                <WordReveal
                  text="Free access to sound analysis, waveform visualization, and PDF report generation for personal equipment diagnostics."
                  className="text-muted-foreground mb-6"
                  delay={0.1}
                />
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
            </GlowCard>

            <GlowCard
              className="rounded-2xl p-8 relative overflow-hidden group border-accent/30 hover:shadow-card-hover transition-all duration-300"
              motionProps={{
                initial: { opacity: 0, x: 20 },
                whileInView: { opacity: 1, x: 0 },
                viewport: { once: true },
                transition: { duration: 0.6 },
              }}
            >
              <div className="absolute top-4 right-4 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Pro
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Company / Technician</h3>
                <WordReveal
                  text="List your services on our platform, receive repair requests, and connect with customers looking for expert maintenance."
                  className="text-muted-foreground mb-6"
                  delay={0.1}
                />
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
            </GlowCard>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The experts behind PERA-SAM working to revolutionize predictive maintenance.
            </p>
          </motion.div>

          {/* Zig-zag single-row team layout */}
          <div className="flex flex-wrap justify-center gap-4 max-w-7xl mx-auto mb-20">
            {[
              {
                name: 'Mr. Bhagya Karunanayake',
                role: 'Project Owner',
                image: ceoImg,
                regNo: 'E/22/184',
                links: { github: 'https://github.com/zerokali20', linkedin: 'https://www.linkedin.com/in/bhagya-karunanayake-b52085270/', email: 'e22184@eng.pdn.ac.lk', portfolio: 'https://www.thecn.com/KK1842' }
              },
              {
                name: 'Mr. Pahan Prabhash',
                role: 'Project Owner',
                image: member2Img,
                regNo: 'E/22/396',
                links: { github: 'https://github.com/PahanPrabash', linkedin: '#', email: 'e22396@eng.pdn.ac.lk', portfolio: 'https://www.thecn.com/PT944' }
              },
              {
                name: 'Mr. Dileka Sandaruwan',
                role: 'Project Owner',
                image: member3Img,
                regNo: 'E/22/336',
                links: { github: 'https://github.com/DilekaSadaruwan', linkedin: '#', email: 'e22336@eng.pdn.ac.lk', portfolio: 'https://www.thecn.com/DS1883' }
              },
              {
                name: 'Miss. Dhanushka Kavindya',
                role: 'Project Owner',
                image: member4Img,
                regNo: 'E/22/188',
                links: { github: 'https://github.com/e22188', linkedin: 'https://www.linkedin.com/in/r-m-d-kavindaya-0423a6364/', email: 'e22188@eng.pdn.ac.lk', portfolio: 'https://www.thecn.com/DK949' }
              },
              {
                name: '#',
                role: 'Project Supervisor',
                image: '#',
                regNo: 'DEPT. OF COMPUTER ENG.',
                links: { linkedin: '#', email: 'aruna@ce.pdn.ac.lk' }
              },
              {
                name: 'Miss. Sayumi Muthukumarana',
                role: 'Tech Lead',
                image: techLeadImg,
                regNo: 'DEPT. OF COMPUTER ENG.',
                links: { linkedin: 'https://www.linkedin.com/in/sayumi-muthukumarana-267148216/', email: 'e19249@eng.pdn.ac.lk' }
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                className="group transition-all duration-300 flex flex-col items-center p-5 w-[160px]"
                style={{ marginTop: index % 2 === 1 ? '48px' : '0px' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {/* Circular avatar */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent/40 ring-2 ring-accent/20 mb-3 flex-shrink-0 relative group-hover:ring-accent/60 transition-all duration-300">
                  {member.image === '#' ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <UserCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="text-center">
                  <h3 className="text-xs font-bold text-foreground leading-tight mb-1">
                    {member.name === '#' ? 'Project Supervisor' : member.name}
                  </h3>
                  <p className="text-accent text-[10px] font-semibold uppercase tracking-wider mb-0.5">{member.role}</p>
                  <p className="text-[9px] text-muted-foreground font-mono tracking-wide mb-3">{member.regNo}</p>

                  <div className="flex items-center justify-center gap-1.5">
                    {member.links.github && (
                      <a href={member.links.github} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20">
                        <Github className="h-3 w-3" />
                      </a>
                    )}
                    {member.links.linkedin && (
                      <a href={member.links.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20">
                        <Linkedin className="h-3 w-3" />
                      </a>
                    )}
                    {member.links.email && (
                      <a href={`mailto:${member.links.email}`} className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20">
                        <Mail className="h-3 w-3" />
                      </a>
                    )}
                    {member.links.portfolio && (
                      <a href={member.links.portfolio} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20">
                        <UserCircle className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile App QR Codes */}
          <GlowCard 
            className="max-w-4xl mx-auto rounded-3xl p-10 flex flex-col md:flex-row items-center gap-12 border-accent/20"
            beamSize={120}
            beamDuration={7}
          >
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-3xl font-bold text-foreground mb-4">Download Our Mobile App</h3>
              <p className="text-muted-foreground mb-8">
                Take PERA-SAM everywhere. Scan the QR code to download our mobile application for Android and iOS devices.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Button variant="outline" className="gap-2">
                  <Play className="h-4 w-4" /> App Store
                </Button>
                <Button variant="outline" className="gap-2">
                  <Play className="h-4 w-4" /> Google Play
                </Button>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/30 transition-all duration-300" />
              <div className="relative bg-white p-4 rounded-xl shadow-2xl">
                <img src={qrCodeImg} alt="Mobile App QR Code" className="w-40 h-40" />
                <div className="text-center mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Scan to Install</div>
              </div>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* Contact Us Section */}
      <ContactSection />

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={ctaBackground}
            alt="CTA Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-primary/80" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <TypewriterReveal
              text="Ready to Analyze Your Equipment?"
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            />
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join With PERA-SAM for early fault detection and preventive maintenance.
            </p>
            <Link to="/register">
              <Button
                size="xl"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow rounded-full px-8"
              >
                Get Started Now
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-7 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex-shrink-0">
              <Logo size="sm" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
              <a href="https://github.com/cepdnaclk/e22-co2060-PERA-SAM" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Github className="h-4 w-4" /> Project Repository
              </a>
              <a href="https://www.ce.pdn.ac.lk/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Cpu className="h-4 w-4" /> Department of Computer Engineering
              </a>
              <a href="https://eng.pdn.ac.lk/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Globe className="h-4 w-4" /> University of Peradeniya
              </a>

            </div>

            <p className="text-sm text-muted-foreground whitespace-nowrap">
              © 2026 PERA-SAM. All rights reserved Team Invictus.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
