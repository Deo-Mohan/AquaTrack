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
        <label htmlFor="invite-register-switch" className="toggle">
          <input 
            type="checkbox" 
            className="input" 
            id="invite-register-switch" 
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
        className="w-full max-w-xl p-8 glass-card z-10"
      >
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
                  <div className="md:col-span-2">
                    <span className="text-text-muted block font-medium">Pre-assigned House/Flat:</span>
                    <span className="text-emerald-400 font-bold block mt-0.5">{inviteDetails.houseNumber} ✓</span>
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
      </motion.div>
    </div>
  );
}
