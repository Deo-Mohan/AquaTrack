import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Shield, ArrowRight, Droplet, Sparkles, CheckCircle2, Award, Zap, Cpu, Activity } from 'lucide-react';
import SharedHeader from '../components/SharedHeader';

export default function FeaturesPage() {
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
        <motion.div variants={itemVariants} className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider mb-6 shadow-md backdrop-blur-md overflow-hidden group">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-[50%] h-[200%] w-8 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent blur-[2px] rotate-[25deg] animate-shimmer-sweep" />
          </div>
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse relative z-10" />
          <span className="relative z-10">Comprehensive Capabilities</span>
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

      {/* CTA Footer Banner */}
      <section className="w-full max-w-4xl px-6 py-16 text-center z-10">
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="glass-card p-10 md:p-14 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-surface/80 to-surface/40 backdrop-blur-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">Ready to Experience Next-Gen Water Management?</h2>
          <p className="text-text/80 mb-8 max-w-xl mx-auto font-medium text-base">
            Join modern housing societies eliminating water disputes and billing errors with AquaTrack today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/login" className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-primary to-cyan-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2">
              Go to Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
