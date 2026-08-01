import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, Sparkles, Building2, Target, ArrowRight, Code2, Globe, ExternalLink, UserCheck } from 'lucide-react';
import SharedHeader from '../components/SharedHeader';

export default function AboutPage() {
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

  const developerDetails = {
    name: "Krishna Mohan Kumar",
    role: "Lead Full-Stack Systems Architect & Developer",
    bio: "Passionate software engineer specialized in building scalable, real-time web platforms, intelligent IoT water tracking infrastructure, multi-lingual AI accessibility, and modern glassmorphic web architectures.",
    portfolio: "https://krishnamohandeo.netlify.app",
    linkedin: "https://www.linkedin.com/in/krishna-mohan-kumar/",
    github: "https://github.com/Deo-Mohan"
  };

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/30 flex flex-col items-center relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/15 via-cyan-500/5 to-transparent blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] pointer-events-none z-0" />

      {/* Shared Glassmorphic Header */}
      <SharedHeader activeTab="about" />

      {/* Hero Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl px-6 pt-16 pb-12 text-center z-10"
      >
        <motion.div variants={itemVariants} className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider mb-6 shadow-md backdrop-blur-md overflow-hidden group">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/20 to-transparent transform -rotate-45 animate-shimmer-sweep" />
          </div>
          <Building2 className="w-4 h-4 text-cyan-400 relative z-10" />
          <span className="relative z-10">Our Mission & Vision</span>
        </motion.div>
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
          Empowering Communities Through <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-500 via-primary to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            Transparent Water Management
          </span>
        </motion.h1>
        <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-text/80 leading-relaxed font-medium max-w-2xl mx-auto">
          AquaTrack was architected to bridge the gap between residential communities, water conservation, and automated financial accounting.
        </motion.p>
      </motion.section>

      {/* Narrative Cards */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-8 w-full z-10"
      >
        <div style={{ perspective: '1000px' }} className="w-full">
          <motion.div 
            variants={itemVariants}
            whileHover={{ rotateY: -5, rotateX: 5, y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="glass-card p-8 rounded-3xl border border-border/70 shadow-xl hover:shadow-2xl text-center flex flex-col justify-between h-full relative overflow-hidden group"
          >
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
              <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 animate-shimmer-sweep" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-text mb-3">Our Mission</h3>
              <p className="text-sm text-text/75 leading-relaxed font-medium">
                To equip residential societies with precise, tier-based water metering software that rewards conservation and eliminates manual billing errors.
              </p>
            </div>
          </motion.div>
        </div>

        <div style={{ perspective: '1000px' }} className="w-full">
          <motion.div 
            variants={itemVariants}
            whileHover={{ rotateY: -5, rotateX: 5, y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="glass-card p-8 rounded-3xl border border-border/70 shadow-xl hover:shadow-2xl text-center flex flex-col justify-between h-full relative overflow-hidden group"
          >
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
              <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 animate-shimmer-sweep" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-text mb-3">Financial Trust</h3>
              <p className="text-sm text-text/75 leading-relaxed font-medium">
                Complete auditability with itemized tariff breakdowns, Razorpay payment integrations, and locked billing cycles for historical integrity.
              </p>
            </div>
          </motion.div>
        </div>

        <div style={{ perspective: '1000px' }} className="w-full">
          <motion.div 
            variants={itemVariants}
            whileHover={{ rotateY: -5, rotateX: 5, y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="glass-card p-8 rounded-3xl border border-border/70 shadow-xl hover:shadow-2xl text-center flex flex-col justify-between h-full relative overflow-hidden group"
          >
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
              <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 animate-shimmer-sweep" />
            </div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mx-auto mb-6 shadow-md group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-text mb-3">Inclusive AI</h3>
              <p className="text-sm text-text/75 leading-relaxed font-medium">
                Multi-language support for 13 Indian regional languages powered by sweet-voice Text-To-Speech (TTS) to assist every resident seamlessly.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Developer Profile Spotlight Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl px-6 py-10 w-full z-10"
      >
        <div style={{ perspective: '1000px' }} className="w-full">
          <motion.div 
            variants={itemVariants}
            whileHover={{ rotateY: -3, rotateX: 3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-card p-8 md:p-12 rounded-[2.5rem] border-2 border-primary/40 shadow-[0_25px_60px_-15px_rgba(59,130,246,0.3)] relative overflow-hidden group bg-gradient-to-br from-surface/90 via-surface/70 to-surface-lighter/50 backdrop-blur-3xl"
          >
            {/* Ambient Corner Glows */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-blue-600/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Sleek Tilted Laser Shimmer Beam */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden">
              <div className="absolute -top-[50%] h-[200%] w-12 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent blur-[2px] rotate-[25deg] animate-shimmer-sweep" />
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-10 relative z-10">
              {/* Creator Avatar with Ring Glow & Creator Badge */}
              <div className="flex-shrink-0 relative group/avatar">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-[3px] bg-gradient-to-tr from-blue-500 via-primary to-cyan-400 shadow-2xl shadow-primary/40 transition-transform duration-300 group-hover/avatar:scale-105">
                  {/* Glowing Pulse Ring */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-500 blur-md opacity-60 group-hover/avatar:opacity-100 transition-opacity animate-pulse" />
                  
                  {/* Avatar Container */}
                  <div className="w-full h-full bg-surface-lighter rounded-[21px] overflow-hidden relative z-10 border border-white/20">
                    <img 
                      src="/male_admin.png" 
                      alt="Krishna Mohan Kumar - Lead Developer" 
                      className="w-full h-full object-cover object-top scale-105 group-hover/avatar:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>

                {/* Creator Badge Pill */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border-2 border-surface shadow-xl flex items-center gap-1.5 z-20 whitespace-nowrap">
                  <UserCheck className="w-3.5 h-3.5" /> Platform Creator
                </div>
              </div>

              {/* Info & Tech Stack */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    <Code2 className="w-3.5 h-3.5" /> Full-Stack Architect
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    AquaTrack Lead
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-text mb-1 tracking-tight drop-shadow-sm">
                  {developerDetails.name}
                </h2>
                <p className="text-xs sm:text-sm text-primary font-extrabold mb-4 tracking-wide">
                  {developerDetails.role}
                </p>
                <p className="text-sm text-text/80 leading-relaxed font-medium mb-6 max-w-2xl">
                  {developerDetails.bio}
                </p>

                {/* Interactive Link Buttons */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
                  {/* Portfolio */}
                  <a 
                    href={developerDetails.portfolio}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-primary to-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider hover:shadow-lg hover:shadow-primary/40 hover:scale-105 transition-all group/btn"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Portfolio</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-90 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>

                  {/* LinkedIn */}
                  <a 
                    href={developerDetails.linkedin}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0a66c2]/15 border border-[#0a66c2]/40 text-[#0a66c2] dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider hover:bg-[#0a66c2]/30 hover:scale-105 transition-all shadow-sm group/btn"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.74a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
                    </svg>
                    <span>LinkedIn</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-90 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>

                  {/* GitHub */}
                  <a 
                    href={developerDetails.github}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface-lighter/90 border border-border text-text font-extrabold text-xs uppercase tracking-wider hover:border-primary/60 hover:scale-105 transition-all shadow-sm group/btn"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-90 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Footer Banner */}
      <section className="w-full max-w-4xl px-6 py-12 text-center z-10">
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="glass-card p-10 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-surface/80 to-surface/40 backdrop-blur-2xl"
        >
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Ready to Transform Your Community?</h2>
          <p className="text-text/80 mb-8 max-w-xl mx-auto font-medium text-base">Join housing societies across India leveraging AquaTrack's smart water billing pipeline.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-primary to-cyan-500 text-white font-black text-sm uppercase tracking-wider hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
