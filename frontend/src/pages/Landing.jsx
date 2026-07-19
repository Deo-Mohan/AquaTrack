import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, ArrowRight, Shield, BarChart3, Users, Zap, CheckCircle2, Sun, Moon, Sparkles } from 'lucide-react';

function FeaturePanelCard({ icon: Icon, title, subtitle, blobsColor, cardType }) {
  return (
    <div style={{ perspective: '1000px' }} className="w-full max-w-[420px] mx-auto">
      <motion.div 
        whileHover={{ rotateY: -8, rotateX: 6, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`panel-container card-${cardType}`}
      >
        <div className="blobs">
          <span className="blob" style={{ backgroundColor: blobsColor[0] }}></span>
          <span className="blob" style={{ backgroundColor: blobsColor[1] }}></span>
          <span className="blob" style={{ backgroundColor: blobsColor[2] }}></span>
          <span className="blob" style={{ backgroundColor: blobsColor[3] }}></span>
          <span className="blob" style={{ backgroundColor: blobsColor[4] }}></span>
        </div>
        <svg className="noise" width="420" height="210" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise-effect">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="1" stitchTiles="stitch"></feTurbulence>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-effect)"></rect>
        </svg>
        <div className="panel-main">
          <div className="panel-content">
            <div className="panel-content-top">
              <div className="flex items-center gap-3">
                <div className="icon-box w-8 h-8 rounded-lg flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 icon-element" />
                </div>
                <p className="title">{title}</p>
              </div>
              <p className="subtitle mt-3">{subtitle}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const [valveClosed, setValveClosed] = React.useState(false);
  const [theme, setTheme] = React.useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });
  const [bgType, setBgType] = React.useState(() => {
    return localStorage.getItem('landing-bg-type') || 'modern';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleBgTypeChange = (type) => {
    setBgType(type);
    localStorage.setItem('landing-bg-type', type);
  };

  React.useEffect(() => {
    if (bgType !== 'liquid') return;

    // Skip loading WebGL/Three.js liquid background on mobile to prevent performance lag
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) return;

    let app = null;
    const initLiquid = async () => {
      try {
        const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js');
        const LiquidBackground = module.default;
        const canvas = document.getElementById('liquid-canvas');
        if (canvas) {
          app = LiquidBackground(canvas);
          // Load the colorful liquid glass pattern
          app.loadImage('/liquid_glass_bg.png');
          app.liquidPlane.material.metalness = 0.4;
          app.liquidPlane.material.roughness = 0.3;
          app.liquidPlane.uniforms.displacementScale.value = 4;
          app.setRain(false);
        }
      } catch (err) {
        console.error("Failed to load LiquidBackground:", err);
      }
    };

    initLiquid();

    return () => {
      if (app) {
        try {
          if (typeof app.destroy === 'function') {
            app.destroy();
          }
        } catch (e) {
          console.error("Error during LiquidBackground destroy:", e);
        }
      }
    };
  }, [bgType]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const slogans = [
    "💧 Every Drop Counts",
    "🌍 Save Water, Save the Planet",
    "🌱 Conserve for the Future",
    "⚡ Smart Billing, Zero Wastage",
    "💧 Be Water Wise",
    "📊 Track. Analyze. Conserve."
  ];

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex flex-col items-center selection:bg-primary/30 scroll-smooth">

      {/* Liquid Background Canvas */}
      <canvas 
        id="liquid-canvas" 
        className={`hidden md:block absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${
          bgType === 'liquid' ? 'opacity-80 z-0' : 'opacity-0 z-[-1]'
        }`} 
      />

      {/* Modern High Quality Background Elements */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 z-0 ${
        bgType === 'modern' ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ 
               backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 1px), radial-gradient(var(--color-primary) 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               backgroundPosition: '0 0, 20px 20px'
             }} 
        />
        {/* Futuristic mesh gradient lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Large Premium Glow Orbs */}
        <div className="absolute top-[-10%] left-[5%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-primary/10 to-blue-500/10 blur-[130px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 blur-[130px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-l from-indigo-500/5 to-blue-500/5 blur-[120px] pointer-events-none" style={{ animationDelay: '1s' }} />
      </div>

      {/* Brand Navbar */}
      <nav className="w-full px-6 py-6 z-20 flex justify-center lg:justify-start">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between max-w-7xl mx-auto w-full"
        >
          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-12 h-12 md:w-24 md:h-24 flex-shrink-0 rounded-full overflow-hidden shadow-xl shadow-primary/30 border border-primary/20 bg-surface">
              <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col items-start gap-1 justify-center">
              <div className="loader loader-md md:loader-lg">
                <span className="outline-layer">AquaTrack</span>
                <span className="fill-layer">AquaTrack</span>
              </div>
              <div className="btn-nextgen-gooey hidden md:block">
                <p>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse mr-1.5 inline-block relative z-10" />
                  <span>The Next Generation of Water Billing</span>
                </p>
                <div className="liquid">
                  <span style={{ "--i": 0 }}><span></span></span>
                  <span style={{ "--i": 1 }}><span></span></span>
                  <span style={{ "--i": 2 }}><span></span></span>
                  <span style={{ "--i": 3 }}><span></span></span>
                  <span style={{ "--i": 4 }}><span></span></span>
                  <span style={{ "--i": 5 }}><span></span></span>
                  <span style={{ "--i": 6 }}><span></span></span>
                  <span className="bg"><span></span></span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none', opacity: 0 }}>
                  <defs>
                    <filter id="gooey-badge-filter">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
                      <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" />
                    </filter>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">

            <label htmlFor="switch" className="toggle">
              <input 
                type="checkbox" 
                className="input" 
                id="switch" 
                checked={theme === 'light'} 
                onChange={toggleTheme}
              />
              <div className="icon icon--moon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>

              <div className="icon icon--sun">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
                  ></path>
                </svg>
              </div>
            </label>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 w-full px-6 max-w-7xl mx-auto pt-16 pb-28 md:pt-24 md:pb-36 flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[85vh]"
      >
        <div className="flex-1 text-center lg:text-left">

          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-text tracking-tighter mb-8 lg:leading-[1.1]">
            Smart Water Management <br className="hidden lg:block" />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              For Communities
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-text/90 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed px-4 lg:px-0">
            Monitor household consumption, allocate shared costs fairly, and conserve water with our intelligent analytics and automated billing platform.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto px-4 lg:px-0">
            <Link to="/register" className="w-full max-w-[280px] sm:w-auto">
              <button className="btn-liquid-bubble-blue">
                <span className="btn-liquid-bubble-text">Get Started</span>
                <div className="btn-liquid-bubble-liquid">
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                </div>
              </button>
            </Link>
            <Link to="/login" className="w-full max-w-[280px] sm:w-auto">
              <button className="btn-liquid-bubble">
                <span className="btn-liquid-bubble-text">Sign In</span>
                <div className="btn-liquid-bubble-liquid">
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                  <div className="btn-liquid-bubble-bubble"></div>
                </div>
              </button>
            </Link>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="flex-1 w-full max-w-xl lg:max-w-none perspective-1000 relative">
          <motion.div 
            whileHover={{ rotateY: -5, rotateX: 5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full rounded-2xl overflow-hidden glass-card p-2 border-primary/20 shadow-2xl shadow-primary/20 relative z-10"
          >
            <div className="relative overflow-hidden rounded-xl">
              <img 
                src="/water_conserve.webp" 
                alt="Dashboard Animation" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent pt-10 pb-4 text-center">
                <span className="text-white text-sm sm:text-base md:text-lg font-extrabold tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Save Water • Save Nature
                </span>
              </div>
            </div>
          </motion.div>

          {/* Kinetic Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
            className="absolute -bottom-6 -right-6 sm:-bottom-10 sm:-right-10 z-20"
          >
            <Link to="/login" className="kinetic-badge bg-surface/90 backdrop-blur-md shadow-2xl shadow-primary/30 border border-primary/20">
              <div className="badge-bg"></div>
              <div className="badge-text">
                <svg viewBox="0 0 100 100" className="w-[90%] h-[90%]">
                  <defs>
                    <path
                      id="circlePath"
                      d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
                    ></path>
                  </defs>
                  <text
                    fontSize="10"
                    fontWeight="700"
                    fill="currentColor"
                    letterSpacing="1.5"
                  >
                    <textPath href="#circlePath" startOffset="0%">
                      SMART WATER BILLING • INTELLIGENT ANALYTICS •
                    </textPath>
                  </text>
                </svg>
              </div>
              <div className="badge-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-[22%] h-[22%]"
                >
                  <path
                    d="M6 18L18 6M18 6H8M18 6V16"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  ></path>
                </svg>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Infinite Marquee Section */}
      <div className="w-full border-y border-border/80 bg-surface/60 backdrop-blur-md py-4 z-10 relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
        
        <div className="marquee-container">
          <div className="marquee-content">
            {slogans.map((slogan, idx) => (
              <span key={idx} className="flex-shrink-0 flex items-center gap-2 pr-12 text-sm md:text-base font-bold text-text tracking-wider uppercase">
                <span className="text-primary font-extrabold text-lg">•</span> {slogan}
              </span>
            ))}
          </div>
          <div className="marquee-content" aria-hidden="true">
            {slogans.map((slogan, idx) => (
              <span key={`dup-${idx}`} className="flex-shrink-0 flex items-center gap-2 pr-12 text-sm md:text-base font-bold text-text tracking-wider uppercase">
                <span className="text-primary font-extrabold text-lg">•</span> {slogan}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="z-10 w-full px-6 max-w-6xl mx-auto py-20 md:py-32 relative"
      >
        <div className="text-center mb-8 md:mb-16">
          <motion.h2 
            variants={fadeUpVariants} 
            className="text-3xl md:text-5xl font-bold text-text mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
          >
            <span>Why Choose</span>
            <span className="loader-text-inherit relative inline-block align-middle">
              <span className="outline-layer">AquaTrack</span>
              <span className="fill-layer">AquaTrack</span>
            </span>
            <span>?</span>
          </motion.h2>
          <motion.p variants={fadeUpVariants} className="text-text/90 max-w-xl mx-auto">Everything you need to manage community water distribution transparently and efficiently.</motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 justify-items-center">
          <FeaturePanelCard
            icon={BarChart3}
            title="USAGE ANALYTICS"
            subtitle="Interactive dashboards and real-time insights to track individual and community water trends."
            blobsColor={[
              "rgba(59, 130, 246, 0.6)",
              "rgba(139, 92, 246, 0.7)",
              "rgba(6, 182, 212, 0.7)",
              "rgba(14, 165, 233, 0.3)",
              "rgba(37, 99, 235, 0.4)"
            ]}
            cardType="blue"
          />
          <FeaturePanelCard
            icon={Users}
            title="FAIR BILLING ALGORITHM"
            subtitle="Proportional cost allocation ensuring residents only pay for exactly what they use, minimizing disputes."
            blobsColor={[
              "rgba(16, 185, 129, 0.6)",
              "rgba(20, 184, 166, 0.7)",
              "rgba(34, 197, 94, 0.7)",
              "rgba(45, 212, 191, 0.3)",
              "rgba(5, 150, 105, 0.4)"
            ]}
            cardType="green"
          />
          <FeaturePanelCard
            icon={Shield}
            title="ANOMALY & LEAK ALERTS"
            subtitle="Automated statistical analysis flags abnormal usage spikes, triggering instant email and dashboard alerts."
            blobsColor={[
              "rgba(244, 63, 94, 0.6)",
              "rgba(239, 68, 68, 0.7)",
              "rgba(249, 115, 22, 0.7)",
              "rgba(251, 146, 60, 0.3)",
              "rgba(225, 29, 72, 0.4)"
            ]}
            cardType="red"
          />
        </div>
      </motion.section>

      {/* Footer CTA */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUpVariants}
        className="w-full py-10 md:py-20 px-6 mt-4 md:mt-10 relative z-10"
      >
        <div style={{ perspective: '1000px' }} className="max-w-4xl mx-auto w-full">
          <motion.div 
            whileHover={typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches ? { rotateY: -3, rotateX: 2, scale: 1.01 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="footer-panel-container p-6 md:p-16 text-center relative overflow-hidden"
          >
            {/* Animated Blobs */}
            <div className="blobs">
              <span className="blob" style={{ backgroundColor: "rgba(59, 130, 246, 0.4)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(16, 185, 129, 0.3)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(139, 92, 246, 0.4)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(6, 182, 212, 0.2)" }}></span>
              <span className="blob" style={{ backgroundColor: "rgba(37, 99, 235, 0.3)" }}></span>
            </div>
            {/* Noise filter */}
            <svg className="noise" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <filter id="noise-effect-footer">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="1" stitchTiles="stitch"></feTurbulence>
              </filter>
              <rect width="100%" height="100%" filter="url(#noise-effect-footer)"></rect>
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
                      <linearGradient id="chrome" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="30%" stopColor="#cbd5e1" />
                        <stop offset="70%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                    </defs>
                    {/* Wall flange/mount */}
                    <path d="M 10,32 L 15,32 L 15,68 L 10,68 Z" fill="url(#chrome)" />
                    
                    {/* Horizontal tap body */}
                    <path d="M 15,44 L 50,44 L 50,56 L 15,56 Z" fill="url(#chrome)" />
                    
                    {/* Valve neck stem on top */}
                    <path d="M 34,34 L 42,34 L 42,44 L 34,44 Z" fill="url(#chrome)" />
                    
                    {/* Curved faucet spout/neck */}
                    <path d="M 50,44 C 65,44 74,48 74,62 L 74,76 L 62,76 L 62,62 C 62,54 58,54 50,54 Z" fill="url(#chrome)" />
                    
                    {/* Aerator nozzle tip */}
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
                  className="text-xs font-semibold uppercase tracking-widest mt-2"
                >
                  {valveClosed ? "Thanks for saving water!" : "Valve Open • Tap to Turn Off!"}
                </motion.p>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-text mb-2 relative z-10">Ready to stop wasting water?</h2>
              <p className="text-xl font-medium text-emerald-400 mb-6 relative z-10 tracking-wide">"Water is the driving force of all nature."</p>
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

      {/* Footer */}
      <footer className="w-full bg-background/50 border-t border-border/50 z-10 mt-8 md:mt-20 relative pt-8 md:pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-surface">
                <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <span className="loader-text-inherit text-xl font-bold">
                <span className="outline-layer">AquaTrack</span>
                <span className="fill-layer">AquaTrack</span>
              </span>
            </div>
            <p className="text-sm text-text/80 leading-relaxed">
              Smart water tracking and automated billing infrastructure for modern communities. Saving water, simplifying payments.
            </p>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-text tracking-wider uppercase">Product</h4>
            <ul className="flex flex-col gap-2 text-sm text-text/80">
              <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="/security" className="hover:text-primary transition-colors">Security</Link></li>
              <li><Link to="/api" className="hover:text-primary transition-colors">Developer API</Link></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-text tracking-wider uppercase">Resources</h4>
            <ul className="flex flex-col gap-2 text-sm text-text/80">
              <li><Link to="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
              <li><Link to="/guides" className="hover:text-primary transition-colors">Guides</Link></li>
              <li><Link to="/status" className="hover:text-primary transition-colors">System Status</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-text tracking-wider uppercase">Legal</h4>
            <ul className="flex flex-col gap-2 text-sm text-text/80">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/license" className="hover:text-primary transition-colors">Licensing</Link></li>
            </ul>
          </div>
        </div>

        {/* Separator and Bottom area */}
        <div className="max-w-6xl mx-auto pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text/80">
            © {new Date().getFullYear()} AquaTrack Systems. All rights reserved.
          </p>

          {/* Background Control Segmented Widget */}
          <div className="hidden md:flex relative items-center p-1 rounded-full bg-surface-lighter/40 border border-border/20 backdrop-blur-md shadow-lg">
            <button
              onClick={() => handleBgTypeChange('modern')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                bgType === 'modern'
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Modern Background"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modern</span>
            </button>
            <button
              onClick={() => handleBgTypeChange('liquid')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                bgType === 'liquid'
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Liquid Background"
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>Liquid</span>
            </button>
          </div>

          <div className="footer-social-container">
            {/* GitHub */}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-btn"
              title="GitHub"
            >
              <svg
                fill="#fff"
                className="footer-social-svg"
                width="20px"
                viewBox="0 0 20 20"
              >
                <g fillRule="evenodd" fill="none" strokeWidth="1" stroke="none">
                  <g fill="#fff" transform="translate(-140.000000, -7559.000000)">
                    <g transform="translate(56.000000, 160.000000)">
                      <path
                        d="M94,7399 C99.523,7399 104,7403.59 104,7409.253 C104,7413.782 101.138,7417.624 97.167,7418.981 C96.66,7419.082 96.48,7418.762 96.48,7418.489 C96.48,7418.151 96.492,7417.047 96.492,7415.675 C96.492,7414.719 96.172,7414.095 95.813,7413.777 C98.04,7413.523 100.38,7412.656 100.38,7408.718 C100.38,7407.598 99.992,7406.684 99.35,7405.966 C99.454,7405.707 99.797,7404.664 99.252,7403.252 C99.252,7403.252 98.414,7402.977 96.505,7404.303 C95.706,7404.076 94.85,7403.962 94,7403.958 C93.15,7403.962 92.295,7404.076 91.497,7404.303 C89.586,7402.977 88.746,7403.252 88.746,7403.252 C88.203,7404.664 88.546,7405.707 88.649,7405.966 C88.01,7406.684 87.619,7407.598 87.619,7408.718 C87.619,7412.646 89.954,7413.526 89.954,7413.526 C89.954,7413.526 91.889,7414.041 91.54,7415.156 C90.97,7415.418 89.522,7415.871 88.63,7414.304 C88.63,7414.304 88.101,7413.319 87.097,7413.247 C87.097,7413.247 86.122,7413.234 87.029,7413.87 C87.029,7413.87 87.684,7414.185 88.139,7415.37 C88.139,7415.37 88.726,7417.2 91.508,7416.58 C91.513,7417.437 91.522,7418.245 91.522,7418.489 C91.522,7418.76 91.338,7419.077 90.839,7418.982 C86.865,7417.627 84,7413.783 84,7409.253 C84,7403.59 88.478,7399 94,7399"
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </a>

            {/* Email */}
            <a 
              href="mailto:contact@aquatrack.com" 
              className="footer-social-btn"
              title="Email"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="#fff"
                width="20px"
                className="footer-social-svg"
                viewBox="0 0 24 24"
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>

            {/* Portfolio */}
            <a 
              href="https://krishnamohandeo.netlify.app" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-btn"
              title="Portfolio"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="#fff"
                width="20px"
                className="footer-social-svg"
                viewBox="0 0 24 24"
              >
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Liquid Gooey SVG Filter */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none', opacity: 0 }}>
        <defs>
          <filter id="liquid">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="liquid" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
