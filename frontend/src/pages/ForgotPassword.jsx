import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Lock, Loader2, Eye, EyeOff,
  AlertCircle, CheckCircle2, X, Sun, Moon, ShieldCheck, KeyRound
} from 'lucide-react';
import api from '../api';

const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter otp, 3 = set new password, 4 = success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

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
  const strength = getPasswordStrength(newPassword);

  /* -------- Step 1: Request OTP -------- */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccessMsg(response.data || 'OTP sent successfully.');
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data
        ? (typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || err.response.data.error || 'Failed to send OTP.')
        : 'Failed to request OTP. Please verify your email.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /* -------- Step 2: Verify OTP -------- */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (otpCode.length !== 6) {
      setError('OTP must be exactly 6 digits.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otpCode: otpCode.trim()
      });
      setStep(3);
    } catch (err) {
      const errorMsg = err.response?.data
        ? (typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || err.response.data.error || 'Invalid OTP.')
        : 'OTP verification failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /* -------- Step 3: Reset Password -------- */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError('Password must contain at least 1 uppercase, 1 lowercase, and 1 number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password-otp', {
        email: email.trim().toLowerCase(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      setStep(4);
    } catch (err) {
      const errorMsg = err.response?.data
        ? (typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || err.response.data.error || 'Failed to reset password.')
        : 'Failed to reset password. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-5xl glass-card rounded-3xl border border-border/30 overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10 backdrop-blur-xl">
        
        {/* LEFT SIDE: Brand Branding Panel */}
        <div className="hidden md:flex md:w-5/12 left-brand-panel text-text p-10 flex-col justify-between relative overflow-hidden">
          
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
                Restore <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Access.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-text-muted text-xs lg:text-sm leading-relaxed"
              >
                Verify your identity with a secure code sent to your email to update your credentials and return to your dashboard.
              </motion.p>
            </div>

            {/* Quick Features List */}
            <div className="space-y-3">
              {[
                { title: "One-Time OTP", desc: "Secure email verification code for identity safety." },
                { title: "Smart Password Rules", desc: "Ensure your new credentials meet modern security standards." },
                { title: "Direct Recovery", desc: "Instant redirect to log in as soon as verification completes." }
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
                      <KeyRound className="w-4.5 h-4.5" />
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

        {/* RIGHT SIDE: Forgot Password Form Panel */}
        <div className="w-full md:w-7/12 flex flex-col justify-between p-8 md:p-12 relative overflow-hidden bg-transparent">
          
          {/* Top Header Bar */}
          <div className="flex justify-end items-center w-full z-20 mb-6">
            <label htmlFor="forgot-password-switch" className="toggle cursor-pointer">
              <input 
                type="checkbox" 
                className="input" 
                id="forgot-password-switch" 
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
          <div className="my-auto w-full max-w-md mx-auto z-10 py-6">
            {/* Mobile-only logo */}
            <div className="flex items-center gap-3 mb-6 md:hidden justify-center">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/30 flex items-center justify-center bg-surface-lighter/50">
                <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text">
                  Aqua<span className="text-primary font-extrabold">Track</span>
                </h1>
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 shadow-lg shadow-primary/10">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text tracking-tight text-center">
                {step === 1 && 'Forgot Password'}
                {step === 2 && 'Verify Code'}
                {step === 3 && 'Set New Password'}
                {step === 4 && 'Password Reset!'}
              </h2>
              <p className="text-text-muted text-sm mt-1 text-center">
                {step === 1 && 'Enter your email address to receive a secure verification OTP.'}
                {step === 2 && `Enter the 6-digit code sent to ${email}.`}
                {step === 3 && 'Choose a strong new password for your account.'}
                {step === 4 && 'Your password has been updated successfully.'}
              </p>
            </div>

            {/* Step indicator */}
            {step < 4 && (
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all ${
                        step >= s
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface-lighter border-border text-text-muted'
                      }`}
                    >
                      {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                ))}
                <span className="ml-2 text-xs text-text-muted font-medium">
                  Step {step} of 3
                </span>
              </div>
            )}

            {/* Error banner */}
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

            {/* Success banner */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 shadow-lg backdrop-blur-sm relative z-10"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMsg}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- STEP 1: Enter Email ---- */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, x: -30 }}
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
                  onSubmit={handleRequestOtp}
                  className="space-y-4"
                >
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Registered Email</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                        placeholder="Enter your registered email"
                        required
                        autoFocus
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    variants={itemVariants}
                    type="submit"
                    disabled={loading}
                    className="btn-next mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ShieldCheck className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* ---- STEP 2: Enter OTP ---- */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-4"
                >
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[8px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/30"
                      placeholder="000000"
                      required
                      autoFocus
                    />
                  </motion.div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-next mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ShieldCheck className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <div className="flex justify-between text-xs text-text-muted mt-2 px-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      ← Edit Email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ---- STEP 3: Set New Password ---- */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleResetPassword}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                        placeholder="••••••••"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Password strength bar */}
                    {newPassword && (
                      <div className="mt-2 px-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-text-muted">Password strength:</span>
                          <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
                            {strength.text}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                          <div
                            className={`h-full ${strength.color} transition-all duration-300`}
                            style={{ width: `${(strength.score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                        placeholder="••••••••"
                        required
                      />
                      {confirmPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {newPassword === confirmPassword ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password rules hint */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '8+ chars', ok: newPassword.length >= 8 },
                      { label: 'A-Z & a-z', ok: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
                      { label: '0-9', ok: /\d/.test(newPassword) },
                    ].map(({ label, ok }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-all ${
                          ok
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-surface-lighter/50 border-border text-text-muted'
                        }`}
                      >
                        {ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-next mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 43">
                          <polygon points="39.58,4.46 44.11,0 66,21.5 44.11,43 39.58,38.54 56.94,21.5"></polygon>
                          <polygon points="19.79,4.46 24.32,0 46.21,21.5 24.32,43 19.79,38.54 37.15,21.5"></polygon>
                          <polygon points="0,4.46 4.53,0 26.42,21.5 4.53,43 0,38.54 17.36,21.5"></polygon>
                        </svg>
                      </>
                    )}
                  </button>
                </motion.form>
              )}

              {/* ---- STEP 4: Success ---- */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-6 py-4"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-xl shadow-emerald-500/10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                  </div>

                  <div className="text-center">
                    <p className="text-text-muted text-sm leading-relaxed">
                      Your password has been changed successfully.
                      You can now sign in with your new password.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/login')}
                    className="btn-next w-full"
                  >
                    <span>Go to Login</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 43">
                      <polygon points="39.58,4.46 44.11,0 66,21.5 44.11,43 39.58,38.54 56.94,21.5"></polygon>
                      <polygon points="19.79,4.46 24.32,0 46.21,21.5 24.32,43 19.79,38.54 37.15,21.5"></polygon>
                      <polygon points="0,4.46 4.53,0 26.42,21.5 4.53,43 0,38.54 17.36,21.5"></polygon>
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 1 && (
              <p className="text-center text-sm text-text-muted mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary hover:text-primary-dark font-medium transition-colors">
                  Sign in
                </Link>
              </p>
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
