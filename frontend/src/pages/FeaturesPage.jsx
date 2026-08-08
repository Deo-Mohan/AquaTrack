import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Shield, ArrowRight, Droplet, Sparkles, CheckCircle2, Award, Zap, Cpu, Activity } from 'lucide-react';
import SharedHeader from '../components/SharedHeader';

export default function FeaturesPage() {
  const [valveClosed, setValveClosed] = React.useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  const featureItems = [
    {
      icon: BarChart3,
      title: "Real-Time Usage Analytics",
      description: "Track water consumption live with high-resolution hourly, daily, and monthly breakdown charts tailored for both households and community admins.",
      tag: "Analytics",
      accent: "from-blue-500 to-cyan-400",
      glowColor: "rgba(59, 130, 246, 0.25)",
      badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/30"
    },
    {
      icon: Users,
      title: "Tiered Proportional Tariff Engine",
      description: "Automated billing engine that calculates base rate limits vs. excess consumption surcharges with precision 4-decimal tariff accuracy.",
      tag: "Billing",
      accent: "from-emerald-500 to-teal-400",
      glowColor: "rgba(16, 185, 129, 0.25)",
      badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    },
    {
      icon: Shield,
      title: "Anomaly & Leak Spikes Detection",
      description: "Statistical monitoring identifies sudden abnormal spikes or continuous flow leaks, firing instant dashboard and email notifications.",
      tag: "Security",
      accent: "from-rose-500 to-amber-500",
      glowColor: "rgba(244, 63, 94, 0.25)",
      badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/30"
    },
    {
      icon: Droplet,
      title: "Bulk CSV & Meter Workstation",
      description: "Community admins can effortlessly upload bulk CSV meter readings or perform manual workstation updates with billing cycle locking.",
      tag: "Management",
      accent: "from-indigo-500 to-purple-400",
      glowColor: "rgba(99, 102, 241, 0.25)",
      badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
    },
    {
      icon: Sparkles,
      title: "AI Household Assistant & Voice TTS",
      description: "Integrated smart chatbot that speaks 45+ Indian regional & global foreign languages with dynamic gender voice synthesis to help residents analyze bills.",
      tag: "AI Tech",
      accent: "from-amber-400 to-orange-500",
      glowColor: "rgba(245, 158, 11, 0.25)",
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30"
    },
    {
      icon: Award,
      title: "Integrated Support & Water Purchase",
      description: "Multi-tiered resident support ticket system paired with direct extra water allowance purchasing and automated late fee enforcement.",
      tag: "Workflow",
      accent: "from-cyan-400 to-blue-600",
      glowColor: "rgba(6, 182, 212, 0.25)",
      badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/30 flex flex-col items-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/15 via-cyan-500/5 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] pointer-events-none z-0" />

      {/* Shared Glassmorphic Header */}
      <SharedHeader activeTab="features" />

      {/* Hero Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl px-6 pt-16 pb-10 text-center z-10"
      >
        <motion.div
          variants={itemVariants}
          className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6 bg-gradient-to-r from-blue-500/15 via-cyan-500/20 to-blue-500/15 border border-cyan-400/40 text-blue-900 dark:text-cyan-200 shadow-sm backdrop-blur-md group hover:border-cyan-400/70 transition-all duration-300"
          whileHover={{ scale: 1.03 }}
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold tracking-wider uppercase text-[11px] bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-cyan-300 dark:to-blue-400 bg-clip-text text-transparent">
            Comprehensive Capabilities
          </span>
        </motion.div>
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
          Everything You Need for <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-500 via-primary to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            Smart Water Management
          </span>
        </motion.h1>
        <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-text/80 max-w-2xl mx-auto leading-relaxed font-medium">
          AquaTrack combines automated tier-based billing, anomaly detection, multi-language AI support, and transparent analytics for modern housing societies.
        </motion.p>
      </motion.section>

      {/* Grid Features */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl px-6 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full z-10"
      >
        {featureItems.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} style={{ perspective: '1000px' }} className="w-full">
              <motion.div 
                variants={itemVariants}
                whileHover={{ rotateY: -6, rotateX: 5, y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="glass-card p-8 border border-border/70 hover:border-primary/60 rounded-3xl relative overflow-hidden flex flex-col justify-between group shadow-xl hover:shadow-2xl transition-all h-full"
                style={{
                  boxShadow: `0 20px 40px -15px ${item.glowColor}`
                }}
              >
                {/* Sleek Tilted Laser Shimmer Beam */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden"
                  style={{ borderRadius: '1.5rem' }}
                >
                  <div 
                    className="absolute -top-[50%] h-[200%] w-10 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent blur-[2px] rotate-[25deg] animate-shimmer-sweep"
                  />
                </div>

                {/* Top Accent Gradient Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.accent} p-[1px] shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <div className="w-full h-full bg-surface/90 backdrop-blur-md rounded-[15px] flex items-center justify-center text-primary group-hover:bg-transparent group-hover:text-white transition-colors duration-300">
                        <IconComp className="w-7 h-7" />
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border backdrop-blur-md ${item.badgeBg}`}>
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text mb-3 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-text/75 leading-relaxed font-medium">{item.description}</p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Active Platform Core
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </motion.div>
            </div>
          );
        })}
      </motion.section>

      {/* Interactive Faucet CTA & Contact Section */}
      <motion.section 
        id="contact"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full py-8 md:py-12 px-6 relative z-10 scroll-mt-24"
      >
        <div style={{ perspective: '1000px' }} className="max-w-4xl mx-auto w-full">
          <motion.div 
            whileHover={typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches ? { rotateY: -3, rotateX: 2, scale: 1.01 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="footer-panel-container p-6 md:p-16 text-center relative overflow-hidden"
          >
            {/* Animated Blobs */}
            <div className="blobs">
              <span className="blob" style={{ backgroundColor: "rgba(59, 130, 246, 0.25)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(6, 182, 212, 0.2)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(14, 165, 233, 0.2)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(37, 99, 235, 0.2)" }}></span>
            </div>
            {/* Noise filter */}
            <svg className="noise" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <filter id="noise-effect-features-footer">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="1" stitchTiles="stitch"></feTurbulence>
              </filter>
              <rect width="100%" height="100%" filter="url(#noise-effect-features-footer)"></rect>
            </svg>
            
            <div className="footer-panel-content">
              {/* Faucet/Valve Animation Container */}
              <div className="flex flex-col items-center mb-8 relative">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Animated Valve/Handle */}
                  <motion.div
                    animate={{ rotate: valveClosed ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 12 }}
                    onClick={() => setValveClosed(!valveClosed)}
                    className="valve-handle absolute top-[12px] left-[33px] w-8 h-8 rounded-full bg-slate-800 border border-primary/80 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform z-20"
                    title="Tap to turn faucet"
                  >
                    {/* Cross Handle details */}
                    <div className="w-5 h-1 bg-primary rounded-full absolute" />
                    <div className="w-1 h-5 bg-primary rounded-full absolute" />
                    <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-primary z-10" />
                  </motion.div>

                  {/* Faucet SVG Tap Shape */}
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md z-10 pointer-events-none">
                    <defs>
                      <linearGradient id="chrome-features" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="30%" stopColor="#cbd5e1" />
                        <stop offset="70%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    <path d="M 10,32 L 15,32 L 15,68 L 10,68 Z" fill="url(#chrome-features)" />
                    <path d="M 15,44 L 50,44 L 50,56 L 15,56 Z" fill="url(#chrome-features)" />
                    <path d="M 34,34 L 42,34 L 42,44 L 34,44 Z" fill="url(#chrome-features)" />
                    <path d="M 50,44 C 65,44 74,48 74,62 L 74,76 L 62,76 L 62,62 C 62,54 58,54 50,54 Z" fill="url(#chrome-features)" />
                    <path d="M 62,76 L 74,76 L 74,80 L 62,80 Z" fill="#475569" />
                  </svg>

                  {/* Falling Droplets */}
                  {!valveClosed && (
                    <>
                      <motion.div
                        animate={{ y: [0, 60], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeIn" }}
                        className="absolute left-[79px] top-[102px]"
                      >
                        <Droplet className="w-4 h-4 text-blue-400 fill-blue-400" />
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 60], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: 0.6, ease: "easeIn" }}
                        className="absolute left-[79px] top-[102px]"
                      >
                        <Droplet className="w-4 h-4 text-blue-400 fill-blue-400" />
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Status Text indicator */}
                <motion.p
                  animate={{ color: valveClosed ? "#10b981" : "#f43f5e" }}
                  className="text-xs font-semibold uppercase tracking-widest mt-2 font-mono"
                >
                  {valveClosed ? "Thanks for saving water!" : "Valve Open • Tap to Turn Off!"}
                </motion.p>
              </div>

              <h2 className="heading text-3xl md:text-5xl font-bold text-text mb-2 relative z-10">Ready to stop wasting water?</h2>
              <p className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent mb-6 relative z-10 tracking-wide">"Water is the driving force of all nature."</p>
              <p className="text-lg text-text/80 mb-8 max-w-2xl mx-auto relative z-10 font-medium">
                Join modern communities that use AquaTrack to reduce their water footprint and automate complex billing cycles.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <Link to="/register">
                  <button className="btn-loader">
                    <div className="btn-loader-bg">
                      <span>JOIN</span>
                    </div>
                    <div className="btn-loader-drops">
                      <div className="btn-loader-drop1"></div>
                      <div className="btn-loader-drop2"></div>
                      <div className="btn-loader-drop3"></div>
                    </div>
                  </button>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-6 mt-8 relative z-10 text-sm text-text/80 font-medium">
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Setup in 5 minutes</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
