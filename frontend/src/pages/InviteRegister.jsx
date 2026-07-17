import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Building, MapPin, Phone, Home,
  CheckCircle2, AlertCircle, X, Sun, Moon, Loader2, ArrowLeft, Eye, EyeOff
} from 'lucide-react';
import api from '../api';
import useUsernameCheck, { UsernameStatusBadge, getUsernameBorderClass } from '../hooks/useUsernameCheck.jsx';

export default function InviteRegister() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteDetails, setInviteDetails] = useState(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const { status: usernameStatus, message: usernameMessage } = useUsernameCheck(username);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [gender, setGender] = useState('female');
  const [showPassword, setShowPassword] = useState(false);

  const [success, setSuccess] = useState(false);
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        const response = await api.get(`/auth/invite/${token}`);
        setInviteDetails(response.data);
        // Pre-fill house number from invitation if admin assigned it
        if (response.data.houseNumber) {
          setHouseNumber(response.data.houseNumber);
        }
        setError('');
      } catch (err) {
        setError(
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message || err.response?.data?.error || 'This invitation link is invalid or has expired.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInviteDetails();
  }, [token]);

  /* -------- Password strength -------- */
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, text: '', color: 'bg-border' };
    if (pass.length > 7) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^a-zA-Z\d]/.test(pass)) score += 1;
    if (score <= 1) return { score, text: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score, text: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { score, text: 'Good', color: 'bg-blue-500' };
    return { score, text: 'Strong', color: 'bg-emerald-500' };
  };
  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('Username is already taken. Please choose another.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!houseNumber.trim()) {
      setError('House Number is required.');
      return;
    }
    if (!mobileNumber.match(/^\d{10}$/)) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post('/auth/register-invite', {
        token,
        username: username.trim(),
        password,
        houseNumber: houseNumber.trim(),
        mobileNumber: mobileNumber.trim(),
        whatsAppNumber: whatsAppNumber.trim() || mobileNumber.trim(),
        gender
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } catch (err) {
      const errorMsg = err.response?.data
        ? (typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || err.response.data.error || 'Registration failed.')
        : 'Registration failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-text-muted text-sm font-medium">Validating invitation token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 bg-background relative overflow-hidden transition-colors duration-300">
      
      {/* Back to Login Button at the very left of the screen */}
      <Link 
        to="/login" 
        className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-lighter/10 border border-border/20 hover:bg-surface-lighter/20 hover:border-primary/40 text-text-muted hover:text-text transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95 group font-medium text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Login</span>
      </Link>

      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      {/* Floating unified card container */}
      <div className="w-full max-w-6xl glass-card rounded-3xl border border-border/30 overflow-hidden shadow-2xl flex flex-col lg:flex-row relative z-10 backdrop-blur-xl">
        
        {/* LEFT SIDE: Brand Branding Panel */}
        <div className="hidden lg:flex lg:w-4/12 left-brand-panel text-text p-10 flex-col justify-between relative overflow-hidden">
          
          {/* Floating Bubble/Droplet Animations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="left-panel-blob-1" />
            <div className="left-panel-blob-2" />
            
            {[...Array(6)].map((_, i) => (
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
                Join Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Community.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-text-muted text-xs lg:text-sm leading-relaxed"
              >
                You've been invited by your administrator to join the community portal. Create your credentials to access your household dashboard.
              </motion.p>
            </div>

            {/* Quick Features List */}
            <div className="space-y-3">
              {[
                { title: "Direct Association", desc: "Instantly link to your pre-assigned block and flat." },
                { title: "Secure Credentials", desc: "Create a unique password to safeguard your billing details." },
                { title: "Live Consumption", desc: "View real-time water usage updates and historical consumption logs." }
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
                      <User className="w-4.5 h-4.5" />
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

        {/* RIGHT SIDE: Invite Registration Form Panel */}
        <div className="w-full lg:w-8/12 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-hidden bg-transparent">
          
          {/* Top Header Bar */}
          <div className="flex justify-end items-center w-full z-20 mb-6">
            <label htmlFor="invite-register-switch" className="toggle cursor-pointer">
              <input 
                type="checkbox" 
                className="input" 
                id="invite-register-switch" 
                checked={theme === 'light'} 
                onChange={toggleTheme}
              />
              <div className="icon icon--moon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="icon icon--sun">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              </div>
            </label>
          </div>

          {/* Form Content */}
          <div className="my-auto w-full z-10 py-6">
            {/* Mobile-only logo */}
            <div className="flex items-center gap-3 mb-6 lg:hidden justify-center">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/30 flex items-center justify-center bg-surface-lighter/50">
                <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Aqua<span className="text-primary font-extrabold">Track</span>
                </h1>
              </div>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-6 py-6 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-xl shadow-emerald-500/15">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text">Welcome to AquaTrack!</h2>
                  <p className="text-text-muted text-sm mt-2 max-w-sm">
                    Your household account has been created and approved. Redirecting you to the login screen in a few seconds...
                  </p>
                </div>
                <Link to="/login" className="btn-next w-full max-w-xs mt-4">
                  <span>Login Immediately</span>
                </Link>
              </div>
            ) : error && !inviteDetails ? (
              <div className="flex flex-col items-center gap-6 py-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-xl shadow-red-500/15">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text">Invalid Invitation Link</h2>
                  <p className="text-red-400/90 text-sm mt-2 max-w-sm">
                    {error}
                  </p>
                  <p className="text-text-muted text-xs mt-3">
                    Please ask your Community Administrator to generate and send a new invitation link.
                  </p>
                </div>
                <Link to="/login" className="btn-next w-full max-w-xs mt-4">
                  <span>Back to Login</span>
                </Link>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-text">Join {inviteDetails?.colonyName}</h2>
                  <p className="text-text-muted text-sm mt-1">
                    Complete your registration details below to activate your household account.
                  </p>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{error}</div>
                      <button type="button" onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Prefilled Info (Read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-lighter/30 border border-border/50 text-xs">
                    <div>
                      <span className="text-text-muted block font-medium">Invited Resident:</span>
                      <span className="text-text font-bold block mt-0.5">{inviteDetails?.fullName}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Email:</span>
                      <span className="text-text font-bold block mt-0.5">{inviteDetails?.email}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Community Name:</span>
                      <span className="text-text font-bold block mt-0.5">{inviteDetails?.colonyName}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-medium">Building / Block:</span>
                      <span className="text-text font-bold block mt-0.5">{inviteDetails?.apartmentBlock}</span>
                    </div>
                    {inviteDetails?.houseNumber && (
                      <div>
                        <span className="text-text-muted block font-medium">Pre-assigned House/Flat:</span>
                        <span className="text-emerald-400 font-bold block mt-0.5">{inviteDetails.houseNumber} ✓</span>
                      </div>
                    )}
                    {inviteDetails?.meterId && (
                      <div>
                        <span className="text-text-muted block font-medium">Pre-assigned Meter ID:</span>
                        <span className="text-emerald-400 font-bold block mt-0.5">{inviteDetails.meterId} ✓</span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Username & House Number */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Username*</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                          className={`w-full bg-surface-lighter/50 border rounded-xl pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-1 transition-all text-text ${getUsernameBorderClass(usernameStatus)}`}
                          placeholder="username"
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameStatus === 'checking' && <span className="text-primary text-xs font-bold animate-pulse">…</span>}
                          {usernameStatus === 'available' && <span className="text-emerald-400 text-sm font-bold">✓</span>}
                          {usernameStatus === 'taken' && <span className="text-red-400 text-sm font-bold">✗</span>}
                          {usernameStatus === 'error' && <span className="text-amber-400 text-sm font-bold">!</span>}
                        </div>
                      </div>
                      <UsernameStatusBadge status={usernameStatus} message={usernameMessage} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">House/Flat Number*</label>
                      <div className="relative">
                        <Home className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={houseNumber}
                          onChange={(e) => setHouseNumber(e.target.value)}
                          disabled={!!inviteDetails?.houseNumber}
                          className={`w-full border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-text ${
                            inviteDetails?.houseNumber 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed' 
                              : 'bg-surface-lighter/50 border-border'
                          }`}
                          placeholder="e.g. A-402, 102"
                          required
                        />
                      </div>
                      {inviteDetails?.houseNumber && (
                        <p className="text-xs text-emerald-400/70 mt-1">Pre-assigned by your Community Admin</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Mobile & WhatsApp */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Mobile Number*</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-text"
                          placeholder="10-digit number"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">WhatsApp Number (Optional)</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          maxLength={10}
                          value={whatsAppNumber}
                          onChange={(e) => setWhatsAppNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-text"
                          placeholder="Defaults to Mobile"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Password & Confirm Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Password*</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-primary/50 text-text"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Strength Bar */}
                      {password && (
                        <div className="mt-1">
                          <div className="h-1 w-full bg-surface-lighter rounded-full overflow-hidden">
                            <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-text-muted block mt-0.5">Strength: {strength.text}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Confirm Password*</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-text"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Gender Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Gender*</label>
                    <div className="flex gap-4">
                      {['female', 'male', 'other'].map((g) => (
                        <label key={g} className="flex items-center gap-2 text-sm text-text cursor-pointer capitalize">
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={gender === g}
                            onChange={() => setGender(g)}
                            className="accent-primary w-4 h-4"
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="btn-next w-full mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>
                        <span>Register Account</span>
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
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
