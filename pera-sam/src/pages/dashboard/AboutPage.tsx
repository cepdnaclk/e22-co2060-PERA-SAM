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
  Phone,
  Github,
  Linkedin,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ceoImg from '@/assets/team/ceo.png';
import member2Img from '@/assets/team/member2.png';
import member3Img from '@/assets/team/member3.png';
import member4Img from '@/assets/team/member4.png';
import techLeadImg from '@/assets/team/tech_lead.png';
import supervisorImg from '@/assets/team/supervisor.png';
import dashboardBg from '@/assets/Dashboardbg.png';

export const AboutPage = () => {
  const milestones = [
    {
      year: '2026',
      title: 'Founded',
      description: (
        <>
          PERA-SAM was founded with a vision to revolutionize mechanical diagnostics using ML-powered sound analysis. We develop the system with traing sound dataset model training which is world wide useable dataset call zendo MIMII dataset we in MVP in our 3rd semster we train the sound using industrai fan sound using{' '}
          <a
            href="https://zenodo.org/records/3384388"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-medium break-all"
          >
            this Zenodo dataset
          </a>
          . We delevering the software solution up to analysis industrial fan sound up to our 3rd semster. New updates will be future.
        </>
      ),
    },
  ];

  const team = [
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
  ];

  return (
    <div
      className="space-y-8 w-full pt-2 pb-10 relative"
      style={{
        backgroundImage: `url(${dashboardBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'local',
      }}
    >
      {/* Background overlay for readability */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'hsl(var(--background) / 0.85)' }}
      />
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          About PERA-SAM
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
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
        className="max-w-4xl mx-auto glass-card rounded-xl p-8"
      >
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
            <p className="text-gray-700 dark:text-white/80 mb-4 text-left leading-relaxed">
              We believe that predictive maintenance should be accessible to everyone.
              Our mission is to democratize industrial-grade sound diagnostics, enabling
              individuals and businesses to detect equipment issues early and prevent
              costly failures.
            </p>
            <p className="text-gray-700 dark:text-white/80 text-left leading-relaxed">
              Using advanced AI trained on the MIMII dataset (Malfunctioning Industrial
              Machine Investigation and Inspection), we can analyze sounds from fans,
              pumps, sliders, and valves with exceptional accuracy.
            </p>
          </div>
          <div className="space-y-4 flex flex-col justify-center md:pl-8">
            {[
              { icon: Activity, label: 'Real-time Analysis', value: 'Sub-5 second processing' },
              { icon: Shield, label: 'Accuracy Rate', value: '99.0% detection rate' },
              { icon: Users, label: 'Active Users', value: 'Grow in Sri Lanka' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-white/10 last:border-0">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-white/60">{stat.label}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{stat.value}</p>
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
        <h2 className="text-2xl font-bold text-white mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4 items-stretch">
          {[
            {
              title: 'Upload Audio',
              description: 'Record and upload audio from your mechanical equipment using any device',
              icon: Waves
            },
            {
              title: 'AI Analysis',
              description: 'Our AI analyzes frequency patterns, amplitude variations, and sound signatures',
              icon: Activity
            },
            {
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
              className="rounded-xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <item.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/70">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-4xl mx-auto glass-card rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Journey</h2>
        <div className="space-y-6">
          {milestones.map((milestone, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {milestone.year}
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-300 dark:bg-white/20 my-2" />
                )}
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{milestone.title}</h3>
                <p className="text-sm text-gray-700 dark:text-white/70 text-left leading-relaxed mt-1">{milestone.description}</p>
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
        <h2 className="text-2xl font-bold text-white mb-12 text-center">Leadership Team</h2>
        <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto mb-10">
          {team.map((member, index) => (
            <motion.div
              key={index}
              className="group transition-all duration-300 flex flex-col items-center p-5 w-[160px]"
              style={{ marginTop: index % 2 === 1 ? '32px' : '0px' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Circular avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-accent/40 ring-2 ring-accent/20 mb-3 flex-shrink-0 relative group-hover:ring-accent/60 transition-all duration-300">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-xs font-bold text-white leading-tight mb-1">
                  {member.name}
                </h3>
                <p className="text-accent text-[10px] font-semibold uppercase tracking-wider mb-0.5">{member.role}</p>
                <p className="text-[9px] text-white/60 font-mono tracking-wide mb-3">{member.regNo}</p>

                <div className="flex items-center justify-center gap-1.5">
                  {member.links.github && (
                    <a
                      href={member.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20"
                    >
                      <Github className="h-3 w-3" />
                    </a>
                  )}
                  {member.links.linkedin && (
                    <a
                      href={member.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20"
                    >
                      <Linkedin className="h-3 w-3" />
                    </a>
                  )}
                  {member.links.email && (
                    <a
                      href={`mailto:${member.links.email}`}
                      className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20"
                    >
                      <Mail className="h-3 w-3" />
                    </a>
                  )}
                  {member.links.portfolio && (
                    <a
                      href={member.links.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-muted hover:bg-accent/10 text-muted-foreground hover:text-accent rounded-md transition-colors border border-transparent hover:border-accent/20"
                    >
                      <UserCircle className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="max-w-4xl mx-auto px-4"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Contact Us</h2>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0">
              <Mail className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Email</p>
              <p className="font-medium text-white">invictus2026sam@gmail.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0">
              <Phone className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Phone</p>
              <p className="font-medium text-white">+94 76 326 3100</p>
              <p className="font-medium text-white">+94 71 525 6633</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0">
              <MapPin className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-white/60 mb-1">Address</p>
              <p className="font-medium text-white whitespace-nowrap">Faculty Of Engineering,</p>
              <p className="font-medium text-white whitespace-nowrap">University of Peradeniya, Sri Lanka.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="accent">
            <Mail className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          <a
            href="https://cepdnaclk.github.io/e22-co2060-PERA-SAM/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentation
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
