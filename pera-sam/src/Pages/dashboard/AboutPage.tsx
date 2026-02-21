import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { 
  Activity, 
  Waves, 
  Shield, 
  Users, 
  Award,
  ExternalLink,
  Mail,
  MapPin,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AboutPage = () => {
  const milestones = [
    { year: '2026', title: 'Founded', description: 'PERA-SAM was founded with a vision to revolutionize mechanical diagnostics using AI-powered sound analysis' },
  ];

  const team = [
    { name: 'Dr. Sarah Chen', role: 'CEO & Co-founder', specialty: 'Machine Learning' },
    { name: 'Michael Torres', role: 'CTO', specialty: 'Audio Signal Processing' },
    { name: 'Dr. James Wright', role: 'Head of AI', specialty: 'Deep Learning' },
    { name: 'Emily Johnson', role: 'Product Lead', specialty: 'User Experience' },
  ];

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-6">
          <Logo size="xl" showText={false} />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          About PERA-SAM
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          PERA-SAM (Sound Analysis Manager) is an AI-powered platform that analyzes 
          mechanical and fan sounds to detect normal or abnormal behavior, helping 
          prevent equipment failures before they happen.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-8"
      >
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              We believe that predictive maintenance should be accessible to everyone. 
              Our mission is to democratize industrial-grade sound diagnostics, enabling 
              individuals and businesses to detect equipment issues early and prevent 
              costly failures.
            </p>
            <p className="text-muted-foreground">
              Using advanced AI trained on the MIMII dataset (Malfunctioning Industrial 
              Machine Investigation and Inspection), we can analyze sounds from fans, 
              pumps, sliders, and valves with exceptional accuracy.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Activity, label: 'Real-time Analysis', value: 'Sub-5 second processing' },
              { icon: Shield, label: 'Accuracy Rate', value: '99.2% detection rate' },
              { icon: Users, label: 'Active Users', value: '50,000+ worldwide' },
              { icon: Award, label: 'Certifications', value: 'ISO 27001 Certified' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { 
              step: '01', 
              title: 'Upload Audio', 
              description: 'Record and upload audio from your mechanical equipment using any device',
              icon: Waves
            },
            { 
              step: '02', 
              title: 'AI Analysis', 
              description: 'Our AI analyzes frequency patterns, amplitude variations, and sound signatures',
              icon: Activity
            },
            { 
              step: '03', 
              title: 'Get Results', 
              description: 'Receive detailed diagnostic reports with confidence scores and recommendations',
              icon: Shield
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="text-4xl font-bold text-accent/20 mb-4">{item.step}</div>
              <div className="w-14 h-14 bg-accent/10 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <item.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold text-foreground mb-6">Our Journey</h2>
        <div className="space-y-6">
          {milestones.map((milestone, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold text-sm">
                  {milestone.year}
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border my-2" />
                )}
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-foreground">{milestone.title}</h3>
                <p className="text-sm text-muted-foreground">{milestone.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Team */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Leadership Team</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass-card rounded-xl p-5 text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{member.name}</h3>
              <p className="text-sm text-accent">{member.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{member.specialty}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold text-foreground mb-6">Contact Us</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">support@pera-sam.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">+1 (555) 123-4567</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">San Francisco, CA</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="accent">
            <Mail className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
