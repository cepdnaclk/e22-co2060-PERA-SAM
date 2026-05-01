import { useEffect, useState } from 'react';
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
import supervisorImg from '@/assets/team/supervisor.png';
import techLeadImg from '@/assets/team/tech_lead.png';
import ceoImg from '@/assets/team/ceo.png';
import member2Img from '@/assets/team/member2.png';
import member3Img from '@/assets/team/member3.png';
import member4Img from '@/assets/team/member4.png';
import qrCodeImg from '@/assets/qr_code.png';
import heroBackground from '@/assets/hero-bg-industrial.png';
import ctaBackground from '@/assets/cta-bg.png';
import { enableGlobalCursorStyles } from 'react-resizable-panels';

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
    description: 'Analyze sounds from laptops, servers, vehicles, pumps, and industrial equipment.',
  },
];


export const LandingPage = () => {
  const [activeSection, setActiveSection] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

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
    ${activeSection === id ? 'text-accent scale-105' : 'text-primary hover:text-accent'}
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
            className="w-full h-full object-cover opacity-[0.33] grayscale scale-105 transition-all duration-1000 group-hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
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
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">ML-Powered Sound Analysis Manager </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Detect Machine Faults
              <br />
              <span className="gradient-text">Before They Happen</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Upload audio recordings of your mechanical equipment and let our Acoustic Intelligence analyze
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
              <motion.div
                key={i}
                className="glass-card rounded-2xl p-8 text-center relative overflow-hidden group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className="w-16 h-16 bg-accent/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <item.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
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
            <motion.div
              className="glass-card rounded-2xl p-8 relative overflow-hidden group hover:shadow-card-hover transition-all duration-300"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
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
                className="glass-card rounded-2xl overflow-hidden group hover:shadow-card-hover transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
                  <div className="flex flex-col gap-1 items-center mb-4">
                    <p className="text-accent text-sm font-medium uppercase tracking-wider">{member.role}</p>
                    <p className="text-[14px] text-muted-foreground font-mono tracking-widest">{member.regNo}</p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {member.links.github && (
                      <a href={member.links.github} className="p-2 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-lg transition-colors border border-transparent hover:border-accent/20">
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {member.links.linkedin && (
                      <a href={member.links.linkedin} className="p-2 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-lg transition-colors border border-transparent hover:border-accent/20">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {member.links.email && (
                      <a href={`mailto:${member.links.email}`} className="p-2 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-lg transition-colors border border-transparent hover:border-accent/20">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {member.links.portfolio && (
                      <a href={member.links.portfolio} className="p-2 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-lg transition-colors border border-transparent hover:border-accent/20">
                        <UserCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile App QR Codes */}
          <div className="max-w-4xl mx-auto glass-card rounded-3xl p-10 flex flex-col md:flex-row items-center gap-12 border-accent/20">
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
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Get In Touch
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions or need support? Our team is here to help you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Mail,
                title: 'Email Us',
                content: 'invictus2026sam@gmail.com',
                link: 'mailto:invictus2026@gmail.com'
              },
              {
                icon: Phone,
                title: 'Call Us',
                content: '+94 76 326 3100      /      +94 70 261 8587',
                link: 'tel:+94763263100'
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                content: 'Faculty of Engineering, University of Peradeniya, Sri Lanka.',
                link: '#'
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="glass-card rounded-2xl p-8 text-center hover:border-accent/40 transition-colors duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <item.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <a
                  href={item.link}
                  className="text-muted-foreground hover:text-accent transition-colors block"
                >
                  {item.content}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Analyze Your Equipment?
            </h2>
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
