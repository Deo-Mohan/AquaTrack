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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-transparent px-4 py-10">
      {/* Top nav bar */}
      <div className="sm:absolute sm:top-8 sm:inset-x-8 flex justify-between items-center w-full max-w-7xl mx-auto px-4 sm:px-0 mb-6 sm:mb-0 z-50">
        <Link
          to="/login"
          className="flex items-center gap-2 text-text-muted hover:text-text transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Login</span>
        </Link>
        <label htmlFor="forgot-password-switch" className="toggle">
          <input 
            type="checkbox" 
            className="input" 
            id="forgot-password-switch" 
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

      {/* Ambient glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 glass-card z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
            <KeyRound className="w-8 h-8 text-primary" />
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
      </motion.div>
    </div>
  );
}
