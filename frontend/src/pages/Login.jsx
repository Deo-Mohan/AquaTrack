import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, AlertCircle, X, Sun, Moon } from 'lucide-react';
import api from '../api';


export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('email', response.data.email || '');
      localStorage.setItem('houseNumber', response.data.houseNumber || '');
      localStorage.setItem('colonyName', response.data.colonyName || '');
      localStorage.setItem('apartmentBlock', response.data.apartmentBlock || '');
      localStorage.setItem('gender', response.data.gender || 'female');
      localStorage.setItem('fullName', response.data.fullName || '');
      localStorage.setItem('mobileNumber', response.data.mobileNumber || '');
      localStorage.setItem('whatsAppNumber', response.data.whatsAppNumber || '');
      if (response.data.role === 'ROLE_ADMIN' || response.data.role === 'ROLE_COMMUNITY_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || err.response?.data?.error || 'An error occurred during login.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 bg-background relative overflow-hidden transition-colors duration-300">
      
      {/* Back to Home Button at the very left of the screen */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-lighter/10 border border-border/20 hover:bg-surface-lighter/20 hover:border-primary/40 text-text-muted hover:text-text transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95 group font-medium text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </Link>

      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      
      {/* Floating unified card container */}
      <div className="w-full max-w-5xl glass-card rounded-3xl border border-border/30 overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10 backdrop-blur-xl">
        
        {/* LEFT SIDE: Brand Branding Panel */}
        <div className="hidden md:flex md:w-5/12 left-brand-panel text-text p-10 flex-col justify-between relative overflow-hidden">
          
          {/* Floating Bubble/Droplet Animations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="left-panel-blob-1" />
            <div className="left-panel-blob-2" />
            
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-primary/10 rounded-full blur-[1px]"
                style={{
                  width: `${Math.random() * 25 + 10}px`,
                  height: `${Math.random() * 25 + 10}px`,
                  left: `${Math.random() * 80 + 10}%`,
                  bottom: `-50px`,
                }}
                animate={{
                  y: [0, -600],
                  x: [0, Math.random() * 40 - 20],
                  opacity: [0, 0.7, 0.7, 0],
                }}
                transition={{
                  duration: Math.random() * 8 + 10,
                  repeat: Infinity,
                  delay: Math.random() * 8,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Brand Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/30 flex items-center justify-center bg-surface-lighter/40 backdrop-blur-md shadow-lg shadow-primary/20">
              <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text">
                Aqua<span className="text-primary font-extrabold">Track</span>
              </h1>
              <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold">Smart Water Management</p>
            </div>
          </div>

          {/* Brand Text / Slogan / Features */}
          <div className="relative z-10 my-auto py-8 space-y-8">
            <div className="space-y-3">
              <motion.h2 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight"
              >
                Every drop <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">has a story.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-text-muted text-xs lg:text-sm leading-relaxed"
              >
                Join your community in reducing water waste, simplifying billing management, and conserving our most precious resource.
              </motion.p>
            </div>

             {/* Quick Features List */}
            <div className="space-y-3">
              {[
                { title: "Smart Water Metering", desc: "Track usage analytics and stay informed." },
                { title: "Fair Consumption Billing", desc: "Pay for precisely what you consume, fairly distributed." },
                { title: "Real-time Waste Warnings", desc: "Instant AI alerts when leaks or anomalies are detected." }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="feature-card relative overflow-hidden group"
                >
                  {/* Liquid glass layers */}
                  <div className="glass-filter absolute inset-0 pointer-events-none transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="glass-overlay absolute inset-0 pointer-events-none" />
                  <div className="glass-specular absolute inset-0 pointer-events-none" />

                  {/* Real content */}
                  <div className="relative z-10 flex items-start gap-3 w-full">
                    <div className="feature-icon-wrapper">
                      <Droplet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-text">{feature.title}</h3>
                      <p className="text-[11px] text-text-muted mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer info */}
          <div className="relative z-10 flex justify-between items-center text-[11px] text-text-muted border-t border-border/10 pt-4">
            <span>© {new Date().getFullYear()} AquaTrack</span>
          </div>
        </div>

        {/* RIGHT SIDE: Login Form Panel */}
        <div className="w-full md:w-7/12 flex flex-col justify-between p-8 md:p-12 relative overflow-hidden bg-transparent">
          
          {/* Top Header Bar */}
          <div className="flex justify-end items-center w-full z-20 mb-6">
            <label htmlFor="login-switch" className="toggle cursor-pointer">
              <input 
                type="checkbox" 
                className="input" 
                id="login-switch" 
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

          {/* Form Content directly inside the right panel */}
          <div className="my-auto w-full max-w-md mx-auto z-10 py-6">
            {/* Mobile-only logo */}
            <div className="flex items-center gap-3 mb-6 md:hidden justify-center">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-primary/30 flex items-center justify-center bg-surface-lighter/50">
                <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-text">
                  Aqua<span className="text-primary font-extrabold">Track</span>
                </h1>
              </div>
            </div>

            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-bold text-text tracking-tight">Welcome back</h2>
              <p className="text-text-muted text-sm mt-1">Sign in to your AquaTrack account</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 shadow-lg backdrop-blur-sm relative z-10"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                  <button 
                    type="button"
                    onClick={() => setError('')} 
                    className="text-red-400/60 hover:text-red-400 transition-colors p-0.5 rounded-lg hover:bg-red-500/10 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              onSubmit={handleLogin} 
              className="space-y-4"
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Username or Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-surface-lighter/30 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-lighter/30 border border-border/50 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </motion.div>

              <motion.button
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                type="submit"
                disabled={loading}
                className="btn-next mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 43">
                      <polygon points="39.58,4.46 44.11,0 66,21.5 44.11,43 39.58,38.54 56.94,21.5"></polygon>
                      <polygon points="19.79,4.46 24.32,0 46.21,21.5 24.32,43 19.79,38.54 37.15,21.5"></polygon>
                      <polygon points="0,4.46 4.53,0 26.42,21.5 4.53,43 0,38.54 17.36,21.5"></polygon>
                    </svg>
                  </>
                )}
              </motion.button>
            </motion.form>

            <p className="text-center text-sm text-text-muted mt-6">
              Don't have an account? <Link to="/register" className="text-primary hover:text-primary-dark font-medium transition-colors">Register</Link>
            </p>
          </div>

          {/* Footer info for mobile/tablets */}
          <div className="mt-6 text-center text-xs text-text-muted md:hidden">
            © {new Date().getFullYear()} AquaTrack. All rights reserved.
          </div>
        </div>

      </div>

      {/* SVG Liquid Glass Filter */}
      <svg style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}>
        <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="70" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </div>
  );
}

