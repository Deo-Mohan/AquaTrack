import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, User, Mail, Lock, Loader2, Home, Building2, Eye, EyeOff, ChevronDown, ArrowLeft, X, Sun, Moon, Clock, ShieldCheck, MapPin } from 'lucide-react';
import api from '../api';
import useUsernameCheck, { UsernameStatusBadge, getUsernameBorderClass } from '../hooks/useUsernameCheck.jsx';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'COMMUNITY_ADMIN',
    houseNumber: '',
    colonyName: '',
    apartmentBlock: '',
    fullName: '',
    mobileNumber: '',
    whatsAppNumber: ''
  });
  // Smart username check — debounced + cached, no redundant API calls
  const { status: usernameStatus, message: usernameMessage } = useUsernameCheck(formData.username);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // Colony & Building data fetched from backend
  const [colonies, setColonies] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedColony, setSelectedColony] = useState(null); // { id, colonyName }
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Fetch colonies on mount
  useEffect(() => {
    setLoadingColonies(true);
    api.get('/public/colonies')
      .then(res => setColonies(res.data))
      .catch(() => setColonies([]))
      .finally(() => setLoadingColonies(false));
  }, []);

  // Fetch buildings when colony changes
  const handleColonyChange = (colony) => {
    setSelectedColony(colony);
    setFormData(prev => ({ ...prev, colonyName: colony.colonyName, apartmentBlock: '' }));
    setBuildings([]);
    if (colony?.id) {
      setLoadingBuildings(true);
      api.get(`/public/colonies/${colony.id}/buildings`)
        .then(res => setBuildings(res.data))
        .catch(() => setBuildings([]))
        .finally(() => setLoadingBuildings(false));
    }
  };

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

  const strength = getPasswordStrength(formData.password);

  const validateForm = () => {
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return false;
    }
    if (usernameStatus === 'taken') {
      setError('Username is already taken. Please choose another.');
      return false;
    }
    if (!formData.fullName || formData.fullName.trim().length < 3) {
      setError('Full Name is required and must be at least 3 characters.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email) || !formData.email.includes('@')) {
      setError('Please enter a valid email address containing @.');
      return false;
    }
    if (!formData.mobileNumber || !/^\d{10}$/.test(formData.mobileNumber)) {
      setError('Mobile number must be exactly 10 digits.');
      return false;
    }
    if (!formData.whatsAppNumber || !/^\d{10}$/.test(formData.whatsAppNumber)) {
      setError('WhatsApp number must be exactly 10 digits.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least 1 uppercase, 1 lowercase, and 1 number.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (formData.role === 'RESIDENT' || formData.role === 'COMMUNITY_ADMIN') {
      if (!formData.colonyName) {
        setError('Please select a colony/community.');
        return false;
      }
      if (!formData.apartmentBlock) {
        setError('Please select a building/block within the colony.');
        return false;
      }
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      submitData.email = submitData.email.trim().toLowerCase();
      const response = await api.post('/auth/register', submitData);
      
      if (formData.role === 'RESIDENT' || formData.role === 'COMMUNITY_ADMIN') {
        setModalMessage("Your application is submitted successfully and is under consideration of higher authority and will be approved in 24-48 hours. You will be notified once approved. Thank you.");
        setShowSuccessModal(true);
      } else {
        setSuccess(response.data || 'Registration successful! Please login.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      if (err.response?.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : err.response.data.message || 'Registration failed.');
      } else {
        setError(err.message === 'Network Error' ? 'Unable to connect to server.' : 'An error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-transparent py-10 px-4">
      <div className="sm:absolute sm:top-8 sm:inset-x-8 flex justify-between items-center w-full max-w-7xl mx-auto px-4 sm:px-0 mb-6 sm:mb-0 z-50">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-text-muted hover:text-text transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>

        <label htmlFor="register-switch" className="toggle">
          <input 
            type="checkbox" 
            className="input" 
            id="register-switch" 
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
      
      {/* Ambient background glow */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl p-8 glass-card z-10 relative overflow-hidden transition-all duration-300"
      >
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl shadow-primary/30 border border-primary/20 flex items-center justify-center bg-surface mb-4">
            <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Create an account</h2>
          <p className="text-text-muted text-sm mt-1">Join AquaTrack today</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="alert-card error z-50"
            >
              <svg className="alert-wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z"
                ></path>
              </svg>

              <div className="alert-icon-container">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  strokeWidth="0"
                  fill="currentColor"
                  stroke="currentColor"
                  className="alert-icon"
                >
                  <path
                    d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z"
                  ></path>
                </svg>
              </div>
              
              <div className="alert-message-text-container">
                <p className="alert-message-text">Error</p>
                <p className="alert-sub-text">{error}</p>
              </div>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 15 15"
                strokeWidth="0"
                fill="none"
                stroke="currentColor"
                className="alert-cross-icon"
                onClick={() => setError('')}
              >
                <path
                  fill="currentColor"
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  clipRule="evenodd"
                  fillRule="evenodd"
                ></path>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="alert-card success z-50"
            >
              <svg className="alert-wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z"
                ></path>
              </svg>

              <div className="alert-icon-container">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  strokeWidth="0"
                  fill="currentColor"
                  stroke="currentColor"
                  className="alert-icon"
                >
                  <path
                    d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"
                  ></path>
                </svg>
              </div>
              
              <div className="alert-message-text-container">
                <p className="alert-message-text">Success</p>
                <p className="alert-sub-text">{success}</p>
              </div>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 15 15"
                strokeWidth="0"
                fill="none"
                stroke="currentColor"
                className="alert-cross-icon"
                onClick={() => setSuccess('')}
              >
                <path
                  fill="currentColor"
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  clipRule="evenodd"
                  fillRule="evenodd"
                ></path>
              </svg>
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
          onSubmit={handleRegister} 
          className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 relative z-10"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Username</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className={`w-full bg-surface-lighter/50 border rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all text-text placeholder-text-muted/70 ${getUsernameBorderClass(usernameStatus)}`}
                placeholder="Choose a username"
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
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                placeholder="Enter your full name"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Mobile Number (10 digits)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">+91</span>
              <input 
                type="tel" 
                maxLength="10"
                value={formData.mobileNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, mobileNumber: val});
                }}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                placeholder="Mobile number"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-text-muted">WhatsApp Number (10 digits)</label>
              <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                <input 
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, whatsAppNumber: prev.mobileNumber }));
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
                />
                <span>Same as Mobile</span>
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">+91</span>
              <input 
                type="tel" 
                maxLength="10"
                value={formData.whatsAppNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, whatsAppNumber: val});
                }}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                placeholder="WhatsApp number"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                placeholder="Enter your email"
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
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
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
            {formData.password && (
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
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text placeholder-text-muted/70"
                placeholder="••••••••"
                required
              />
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="relative z-30">
            <label className="block text-sm font-medium text-text-muted mb-1.5">Account Role</label>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Community Admin (Public Sign-up)</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1.5">
              Residents/Household Users can only onboard via secure links sent by their Community Admins.
            </p>
          </motion.div>

          {(formData.role === 'RESIDENT' || formData.role === 'COMMUNITY_ADMIN') && (
            <>
              {/* Step 1: Select Colony */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-text-muted mb-1.5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Colony / Community</span>
                </label>
                {loadingColonies ? (
                  <div className="flex items-center gap-2 text-text-muted text-sm px-3 py-2.5 border border-border rounded-xl bg-surface-lighter/50">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading colonies...
                  </div>
                ) : colonies.length === 0 ? (
                  <div className="px-3 py-2.5 border border-amber-500/30 bg-amber-500/10 rounded-xl text-amber-400 text-xs">
                    No colonies have been registered yet. Please contact the Super Admin.
                  </div>
                ) : (
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <select
                      value={selectedColony?.id || ''}
                      onChange={(e) => {
                        const colony = colonies.find(c => c.id === parseInt(e.target.value));
                        if (colony) handleColonyChange(colony);
                      }}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text appearance-none cursor-pointer"
                      required
                    >
                      <option value="">-- Select Colony --</option>
                      {colonies.map(colony => (
                        <option key={colony.id} value={colony.id}>{colony.colonyName}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                )}
              </motion.div>

              {/* Step 2: Select Building (only shown once colony is selected) */}
              {selectedColony && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Building / Block in {selectedColony.colonyName}</span>
                  </label>
                  {loadingBuildings ? (
                    <div className="flex items-center gap-2 text-text-muted text-sm px-3 py-2.5 border border-border rounded-xl bg-surface-lighter/50">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading buildings...
                    </div>
                  ) : buildings.length === 0 ? (
                    <div className="px-3 py-2.5 border border-amber-500/30 bg-amber-500/10 rounded-xl text-amber-400 text-xs">
                      All buildings in this colony already have a Community Admin assigned. Contact the Super Admin.
                    </div>
                  ) : (
                    <div className="relative">
                      <Building2 className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      <select
                        value={formData.apartmentBlock}
                        onChange={(e) => setFormData(prev => ({ ...prev, apartmentBlock: e.target.value }))}
                        className="w-full bg-surface-lighter/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-text appearance-none cursor-pointer"
                        required
                      >
                        <option value="">-- Select Building --</option>
                        {buildings.map(b => (
                          <option key={b.id} value={b.buildingName}>{b.buildingName}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}


          <motion.button 
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            type="submit" 
            disabled={loading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="col-span-1 md:col-span-2 btn-plant mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {/* Water Droplets Originating from Button */}
            <div className="absolute top-1/2 left-0 w-full pointer-events-none z-[-2]">
              {[...Array(15)].map((_, i) => {
                const size = Math.random() * 15 + 10;
                return (
                  <div 
                    key={i}
                    className={`droplet ${isHovered ? 'active' : ''}`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      animationDuration: `${Math.random() * 3 + 2}s`,
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  />
                );
              })}
            </div>

            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <>
                Conserve Water
                <div className="icon-1">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" version="1.1" style={{shapeRendering:"geometricPrecision", textRendering:"geometricPrecision", imageRendering:"optimizeQuality", fillRule:"evenodd", clipRule:"evenodd"}} viewBox="0 0 208.52 511.88"><path className="fil-leaf-1" d="M121.86 141.25c16.73,2.91 65.77,9.16 77.74,-14.94 14.49,-29.19 12.6,-56.91 -15.12,-69.09 -11.3,-4.96 -22.28,-7.7 -32.28,-9.66 -24.58,24.72 -41.22,75.51 -43.83,83.82 4.31,3.56 8.81,6.86 13.49,9.87zm-17.26 41.05c2.87,7.92 8.26,29.59 7.63,79.7 -0.16,12.74 -0.48,25.41 -0.81,38.43 -1.4,55.59 -2.96,117.52 7.12,210.69l-7.09 0.75c-10.12,-93.56 -8.56,-155.77 -7.15,-211.61 0.33,-13.06 0.65,-25.77 0.81,-38.35 0.53,-42.42 -3.06,-63.29 -5.69,-72.77 -7.55,8.48 -18.48,15.07 -34.33,16.54 -26.77,2.47 -43.19,-16.99 -52.84,-36.58 16.49,-8.49 65.65,-32.22 98.27,-31.47 1.86,1.42 3.76,2.8 5.69,4.13 -0.15,5.56 -1.43,24.61 -11.62,40.53zm-41.18 -148.65c-0.32,0.84 1.68,9.87 -6.19,10.71 -7.87,0.84 -3.26,-5.14 -6.82,-7.98 -3.57,-2.84 -9.97,-14.59 1.99,-15.96 11.97,-1.37 11.02,13.23 11.02,13.23zm124.63 55.54c0,0 -3.89,14.8 -10.18,18.69 -6.3,3.88 -22.78,7.24 -28.87,0.11 -6.09,-7.14 -1.57,-31.71 17.64,-30.45 19.21,1.26 22.68,8.4 21.42,11.65zm-101.53 67.51c0,0 5.88,5.56 5.46,9.87 -0.42,4.3 -5.78,19.21 -14.07,20.05 -8.29,0.84 -24.15,-6.82 -21.84,-17.53 2.31,-10.71 10.5,-11.34 12.6,-10.6 2.1,0.74 3.36,2.1 17.85,-1.78zm61.49 -109.94c-12.74,-2.33 -23.63,-3.69 -31.15,-7.4 0,0 -2.41,15.22 -4.51,19.74 -2.1,4.51 -6.3,17.32 -14.8,21.1 -8.5,3.78 -9.87,-28.14 4.62,-45.15 0,0 -10.13,-4.4 -22.34,-9.92 -11.47,31.21 -7.3,64.58 -7.28,64.68l-0.48 0.06c9.73,14.77 20.76,28.04 33.37,39.01 3.68,-11.43 19.48,-57.46 42.58,-82.12zm-71.44 -23.1c-16.59,-7.55 -35.59,-16.58 -38.25,-19.47 -1.97,-2.14 -4.87,-3.72 -7.63,-4.2 9.11,27.4 20.23,54.59 34.36,78.62 1.13,1.92 2.28,3.82 3.45,5.7 -0.66,-11.21 -0.85,-36.56 8.07,-60.65zm-49.59 -23.57c-2.34,0.66 -4.05,2.62 -4.09,6.41 -0.1,9.45 -9.03,35.38 -9.03,35.38 0,0 33.07,14.91 22.99,23.1 -10.08,8.19 -25.41,-8.5 -26.35,-9.34 0,0 -5.94,16.24 -8.44,35.85 11.53,-1.14 38.81,-2.11 72.53,8.35 -4.45,-6.19 -8.65,-12.68 -12.61,-19.42 -14.44,-24.56 -25.77,-52.36 -35.01,-80.32zm-25.33 95.01c-0.61,6.01 -0.86,12.26 -0.49,18.39 0,0 56.17,-9.87 57.33,8.71 1.15,18.58 -58.48,9.45 -58.48,9.45 0,0 2.71,16.68 10.73,34.23 16.07,-8.25 62.14,-30.45 95.29,-31.76l-1.75 -1.5 0.01 -0.03c-9.54,-8.13 -18.2,-17.54 -26.08,-27.89l-0.01 0.04c-36.16,-12.16 -65.36,-10.82 -76.53,-9.63z"></path></svg>
                </div>
                <div className="icon-2">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" version="1.1" style={{shapeRendering:"geometricPrecision", textRendering:"geometricPrecision", imageRendering:"optimizeQuality", fillRule:"evenodd", clipRule:"evenodd"}} viewBox="0 0 420.62 554.38"><path className="fil-leaf-2" d="M1.57 554.38c-0.01,-0.44 -2.46,-153.75 -1.23,-217.01 0.74,-38.16 6.99,-96.57 32.48,-148.36 17.72,-36 44.66,-68.8 85.37,-89.54l32.28 -4.39c21.9,-6.8 39.46,-7.7 45.04,-7.81 4.32,4.98 10.37,12.18 17.72,21.54 -0.39,10.62 -6.13,113.86 -82.32,208.5 -31.36,-18.46 -51.28,-57.42 -51.28,-57.42 52.13,-30.97 58.88,-51.52 69.61,-68.07 10.73,-16.56 2.45,-44.16 -11.65,-26.06 -14.11,18.09 -65.01,68.07 -65.01,68.07 -12.27,-87.7 33.12,-110.39 33.12,-110.39l0.34 -0.64c-27.64,18.92 -47.12,44.59 -60.77,72.35 -24.37,49.53 -30.35,105.69 -31.07,142.44 -1.22,63.07 1.22,216.14 1.23,216.58l-13.85 0.22zm216.49 -439.34c17.47,22.75 40.96,56.05 66.08,99.4 0.27,13.62 0.62,100.64 -33.48,153.85 -24.85,-9.4 -40.14,-15.03 -40.14,-15.03 12.57,-11.04 46.61,-87.09 23.3,-91.68 -23.3,-4.6 -47.99,84.63 -47.99,84.63 -21.55,-10.35 -42.58,-21.94 -50.33,-26.28 68.93,-86.04 80.61,-179.05 82.56,-204.89zm71.3 108.53c28.78,50.84 59.27,114.6 85.02,190.51 -4.31,0.96 -8.4,-1.03 -8.4,-1.03 -42.77,-17.04 -82,-32.13 -110.36,-42.88 29.72,-47.26 33.46,-119.21 33.74,-146.6zm106.95 70.68c0,0 -16.4,-14.1 -20.54,-22.84 -4.14,-8.74 -15.18,-3.68 -13.95,4.29 1.23,7.97 11.5,45.69 12.27,51.21 0.77,5.52 20.08,6.13 21,-1.99 0.92,-8.13 2.76,-23.61 1.23,-30.66zm-88.46 28.98c0,0 -8.43,4.29 -7.51,15.49 0.92,11.19 10.89,28.36 18.09,30.66 7.21,2.3 18.7,-25.14 -10.58,-46.15zm-109.42 -240.52c15.35,-63.34 56.21,-82.7 93.65,-82.7 38.33,0 65.31,22.23 65.31,22.23 0,0 -11.65,13.03 -33.42,13.95 -21.77,0.92 -28.52,11.65 -28.98,16.41 -0.46,4.75 1.53,16.25 32.35,18.24 30.82,1.99 55.19,-25.14 55.19,-25.14 16.95,23.84 26.52,45.94 31.83,64.51 -16.87,6.83 -73.84,22.75 -197.04,-4.57 -8.01,-10.2 -14.48,-17.86 -18.9,-22.93zm217.3 32.51c7.8,30.68 3.91,50.53 3.91,50.53 -55.65,4.45 -56.73,-5.98 -77.73,-6.59 -21,-0.61 -22.69,28.06 14.41,34.19 37.1,6.13 63.01,-1.99 63.01,-1.99 -1.13,20.07 -2.53,38.3 -4.11,54.87 -17.3,-0.51 -66.77,-6.48 -137.23,-52.73l-0.13 0.2c-21.09,-34.73 -40.52,-62.06 -55.57,-81.67 118.17,25.28 175.11,10.36 193.44,3.2zm-1.01 136.18c-10.45,105.02 -28.21,141.06 -31.88,153.37 -0.95,3.17 -2.29,5.35 -3.82,6.82 -27.16,-79.89 -59.57,-146.38 -89.72,-198.56l-0.02 -0.57 -0.3 0.01c-1.8,-3.11 -3.59,-6.18 -5.38,-9.19 66.28,41.51 113.43,47.51 131.12,48.12z"></path></svg>
                </div>
                <div className="icon-3">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" version="1.1" style={{shapeRendering:"geometricPrecision", textRendering:"geometricPrecision", imageRendering:"optimizeQuality", fillRule:"evenodd", clipRule:"evenodd"}} viewBox="0 0 313.64 405.79"><path className="fil-leaf-3" d="M268.76 135.61c0,0 -22.17,11.9 -50.23,28.92 -21.12,-5.52 -82.36,-27.74 -81.95,-100.04l-0.14 -0.02c3.32,-12.49 5.48,-21.39 6.11,-24.05 10.61,-20.2 38.05,-50.12 105.57,-37.36 98.73,18.65 57.69,95.74 53.71,98.23 -3.98,2.49 -21.39,6.71 -72.86,-30.59 0,0 -18.15,-14.17 -21.88,12.68 -3.73,26.86 48.99,48.99 61.68,52.23zm-6.57 270.17c-0.06,-0.43 -20.14,-148.39 -56.4,-233.41 -9.42,5.88 -19.19,12.19 -28.79,18.69 0,0 -17.41,-10.44 -27.6,-29.59 -10.2,-19.15 -5.22,-21.76 -13.43,-22.26 -8.21,-0.5 -5.1,34.69 19.52,64.78 0,0 -13.7,11.34 -26.34,23.33 -5.68,-9.69 -18.35,-34.11 -23.43,-66.68l-0.05 -0.01c0.31,-0.8 0.62,-1.59 0.93,-2.38 10.57,-26.8 19.85,-57.53 26.36,-81.01 6.01,61.39 57.45,83.42 80.65,90.27 37.09,86.22 59.66,236.37 59.72,236.8l-11.15 1.45zm-136.16 -175.46c-7.88,7.66 -14.84,15.23 -17.05,19.93 0,0 -7.21,-23.75 -14.42,-18.65 -7.21,5.1 2.11,32.08 2.11,36.8 0,0 -17.66,31.83 -20.89,34.57 -0.83,0.7 -1.66,1.24 -2.49,1.6 -0.23,-13.47 2.61,-34.23 7.4,-57.21 5.42,-26.02 13.33,-54.79 22.1,-79.02 5.96,30.61 18.04,53.25 23.24,61.99zm-56.93 74.37c-0.87,-0.37 -1.72,-1.02 -2.52,-1.97 -2.74,-3.23 -15.17,-25.61 -15.17,-25.61 0,0 6.22,-19.03 15.17,-32.95 8.95,-13.93 -5.84,-15.67 -10.82,-7.21 -4.97,8.46 -12.56,24.74 -12.56,24.74 0,0 -6.31,-12.32 -13.32,-27.52 29.11,-16 53.59,-43.62 66.24,-59.59 -7.75,22.68 -14.67,48.42 -19.56,71.93 -4.83,23.18 -7.69,44.25 -7.46,58.19zm-40.98 -74.37c-7.17,-15.81 -14.58,-33.78 -16.38,-44.11 0,0 40.04,-13.68 46.01,-27.11 5.97,-13.43 -12.68,-19.4 -51.23,4.48 0,0 -7.71,-17.19 -6.37,-43.78 66.5,2.13 113.04,-29.91 128.31,-42.15 -6.46,23.16 -15.53,53 -25.8,79.07 -0.57,1.44 -1.13,2.91 -1.7,4.39 -5.54,7.86 -35.3,48.46 -72.84,69.21zm-27.68 -114.74c0.71,-8.36 2.33,-17.55 5.34,-27.35 0,0 47.75,5.84 50.36,-10.57 2.61,-16.41 -41.28,-5.84 -41.28,-5.84 0,0 25.99,-35.56 60.3,-33.82 28.82,1.46 52.37,13.88 59.18,17.82 -1.11,4.27 -2.41,9.2 -3.89,14.62 -5.75,5.22 -54.72,47.49 -130.01,45.14z"></path></svg>
                </div>
                <div className="icon-4">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" version="1.1" style={{shapeRendering:"geometricPrecision", textRendering:"geometricPrecision", imageRendering:"optimizeQuality", fillRule:"evenodd", clipRule:"evenodd"}} viewBox="0 0 359.65 724.72"><path className="fil-leaf-4" d="M251.9 132.52c5.01,7.69 14.83,26.38 10.9,50 12.23,19.64 25.84,44.23 37.91,76.21 15.43,40.91 28.34,93.9 32.59,164.05 8.43,139.15 26.3,300.52 26.36,300.99l-8.9 0.95c-0.05,-0.47 -17.95,-162.05 -26.39,-301.41 -4.19,-69.11 -16.87,-121.23 -32.03,-161.42 -10.46,-27.74 -22.12,-49.81 -32.97,-67.87 -11.69,25.15 -46.54,32.88 -60.3,31.22 0,0 7.39,-21.36 26.38,-35.61 18.99,-14.24 -34.02,-32.18 -48.79,33.5 0,0 -17.36,-0.38 -44.69,-16.34 11.21,-15.23 54.9,-71.68 91.8,-79.27 13.37,2.8 23.04,4.3 28.14,5zm-123.8 71.95c-11.63,-7.19 -24.9,-17.14 -39.29,-30.93 0,0 33.76,-24 51.43,-32.18 3.94,-1.82 6.23,-3.74 7.22,-5.53 0.4,-0.74 0.59,-1.45 0.57,-2.14 -0.14,-5.14 -11.54,-8.37 -24.93,-3.67 -19.52,6.86 -41.67,17.93 -50.64,27.17 0,0 -14.95,-14.16 -27.28,-30.46 13.73,-5.9 46.68,-16.9 105.36,-19.32 1.37,0.46 2.74,0.91 4.09,1.36 23.42,7.71 43.79,13.08 60.01,16.77 -36.68,13.59 -76.29,64.98 -86.55,78.94zm-85.63 -81.43c-0.55,-0.76 -1.08,-1.53 -1.61,-2.3 -3.4,-4.95 -6.39,-9.96 -8.49,-14.72 0,0 8.59,-1.25 17.61,-3.44 10.4,-2.52 21.36,-6.28 20.37,-10.8 -0.81,-3.7 -4.42,-6.8 -10.79,-8.26 -8.15,-1.86 -20.83,-1.06 -38,4.57 0,0 -20.04,-38.77 -21.36,-44.84 -0.46,-2.1 -0.09,-3.88 0.82,-5.27 21.98,13.27 43.46,24.73 64.03,34.61 26.53,12.75 51.57,22.88 74.23,30.91 -53.49,3.36 -83.97,13.91 -96.81,19.53zm-37.55 -87.92c1.59,-0.53 3.43,-0.65 5.29,-0.31 5.8,1.06 22.42,11.6 51.17,8.44 0,0 5.79,9.17 11.47,13.81 1.59,1.3 3.18,2.25 4.62,2.54 5.68,1.14 7.25,-7.71 1.67,-15.07 -0.9,-1.18 -1.98,-2.33 -3.26,-3.39 0,0 2.1,-0.44 5.61,-1.29 3.8,-0.92 9.25,-2.33 15.46,-4.19 14.66,33.07 29.11,52.04 37.62,61.42 -20.84,-7.6 -43.57,-16.96 -67.53,-28.47 -19.97,-9.59 -40.81,-20.68 -62.13,-33.48zm96.34 -0.79c8.37,-2.65 17.67,-6.03 26.06,-10.07 0,0 7.91,43.25 34.29,54.07 0,0 0.41,0.11 1.05,0.18 3.11,0.38 11.59,0.1 4.32,-16.31l-0.1 -0.23c-8.97,-20.04 -20.57,-40.88 -21.36,-45.89 0,0 15.49,-6.72 36.74,-11.5l1.33 -0.3c2.14,70.96 19.13,103.97 27.19,115.76 -15.3,-3.61 -33.91,-8.65 -55,-15.61 -1.04,-0.34 -2.1,-0.69 -3.15,-1.05l0.05 -0.46 -6.39 -1.7 -1.85 -0.64c-3.65,-3.1 -23.05,-20.99 -43.18,-66.26zm86.77 -30.97c8.74,-1.72 18.24,-3.02 27.9,-3.37 0,0 -7.65,53.01 14.24,63.3 0,0 17.41,7.91 6.33,-60.93 0,0 48,6.33 46.95,59.34 -0.91,45.76 -25.8,62.44 -32.59,66.14 -5.12,-0.73 -13.59,-2.1 -24.84,-4.43l-0.01 -0.77 -7.74 -0.89 -0.69 -0.15c-4.02,-4.5 -27.19,-33.99 -29.55,-118.24z"></path></svg>
                </div>
                <div className="icon-5">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" version="1.1" style={{shapeRendering:"geometricPrecision", textRendering:"geometricPrecision", imageRendering:"optimizeQuality", fillRule:"evenodd", clipRule:"evenodd"}} viewBox="0 0 513.57 1042.57"><path className="fil-leaf-5" d="M207.74 252.52c0,0 -3.36,127.53 94.31,130.89 0,0 36.92,0.67 66.79,-32.89 0,0 -39.94,-10.4 -50.01,-47.99 -10.07,-37.59 63.1,-27.52 82.23,3.36 0,0 17.47,-34.44 35.17,-77.24 -60.5,-36.51 -169.57,-35.65 -182.77,-35.4 -16.15,16.52 -28.62,31.28 -37.69,42.91l-0 -0c-3.79,4.86 -6.98,9.18 -9.61,12.86l0.02 -0.03c-0.48,0.66 -0.93,1.31 -1.37,1.93l-0.05 0.08 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.7 1 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07 -0.05 0.07c1.63,-0.35 3.25,-0.73 4.87,-1.16zm202.05 -202.04c0,0 -10.74,-24.5 15.1,-37.92 25.84,-13.42 40.95,2.68 38.93,7.72 -2.01,5.03 -36.92,38.6 -54.03,30.21zm41.95 28.86c0,0 3.69,-24.84 23.16,-20.14 19.47,4.7 -2.35,24.16 -6.71,25.51 -4.36,1.34 -17.79,3.36 -16.45,-5.37zm-13.33 143.98c6.34,-15.57 12.61,-32.08 18.03,-48.32 0,0 -14.77,-5.71 -43.63,-9.06 -28.86,-3.36 -48.67,-8.06 -47.99,-20.47 0.67,-12.42 19.47,-12.42 31.21,-12.08 11.75,0.34 44.3,9.4 65.45,21.48 0,0 6.06,-15.02 14,-34.26 -13.59,-6.7 -55.53,-24.2 -111.04,-17.16 -44.54,28.56 -79.28,58.2 -105.29,84.07 26.84,-0.04 122.78,2.26 179.27,35.82zm39.24 -107.98c11.26,-27.2 25.32,-60.47 31.48,-72.24 2.59,-4.94 4.04,-8.91 4.44,-12.19l-0.07 0.03c-7.86,2.78 -15.55,5.64 -23.08,8.58l-0.06 0.03c-43.75,17.09 -81.99,36.73 -115.12,57.12 50.7,-3.62 88.86,12.06 102.42,18.68zm-266.36 117.31l-0 0 0.19 -0.24c1.61,-2.06 3.33,-4.22 5.15,-6.47l0.6 -0.74c1.8,-2.22 3.71,-4.51 5.72,-6.89l0.53 -0.62c0.65,-0.77 1.31,-1.54 1.99,-2.33l0.45 -0.53c0.8,-0.93 1.62,-1.87 2.44,-2.82l-0.47 -0.16c26.43,-78.83 20.84,-169.24 18.14,-197.94 -29.06,6.17 -63.45,14.58 -92.65,24.81 0,0 -10.74,27.18 -8.73,47.66 2.01,20.47 10.4,39.6 17.79,47.99 7.38,8.39 -4.03,19.8 -14.1,11.08 -10.07,-8.73 -33.9,-27.86 -31.88,-85.58 0,0 -51.69,29.87 -54.37,96.99 -2.41,60.36 60.31,104.42 124.22,99.27 -29.57,40.64 -52.99,92.96 -71.11,145.44 -34.37,99.52 -49.74,199.84 -51.89,221.41 -1.69,16.94 -9.22,61.56 -18.01,108.82 -8.48,45.59 -18.12,93.5 -24.81,121.32 -13.86,57.6 -20.46,188.53 -20.47,188.9l11.37 0.54c0.02,-0.37 6.56,-130.3 20.16,-186.81 6.77,-28.15 16.45,-76.26 24.95,-121.9 8.84,-47.51 16.42,-92.5 18.15,-109.76 2.13,-21.29 17.32,-120.37 51.32,-218.82 17.84,-51.67 40.86,-103.1 69.86,-142.81 3.19,-7.16 11.12,-24.22 15.49,-29.83zm25.46 -30.01c1.38,-1.51 2.8,-3.04 4.25,-4.58l0.29 -0.31c0.84,-0.89 1.69,-1.8 2.55,-2.7l0.67 -0.7c2.7,-2.84 5.52,-5.73 8.45,-8.67l0.65 -0.65c0.97,-0.98 1.96,-1.96 2.96,-2.95l0.38 -0.38c3.13,-3.09 6.39,-6.23 9.77,-9.41l0.58 -0.54c4.62,-4.35 9.48,-8.77 14.57,-13.25l0.68 -0.6c3.78,-3.32 7.7,-6.68 11.74,-10.06l0.29 -0.24c5.54,-4.63 11.33,-9.29 17.36,-13.99l0.57 -0.44c6.07,-4.71 12.39,-9.44 18.97,-14.18l0.24 -0.17c4.93,-3.55 10.01,-7.1 15.23,-10.64l0.24 -0.16c4.13,-2.8 8.36,-5.6 12.68,-8.38 1.65,-4.78 23.49,-68.56 28.59,-99.33 -14.9,-0.31 -31.83,-0.37 -51.18,-0.15 0,0 -12.75,35.24 -9.73,54.03 3.02,18.79 9.73,34.9 -0.34,37.25 -10.07,2.35 -31.21,-20.47 -17.79,-89.27 0,0 -24.82,3.76 -57.81,10.6 2.58,27.06 8.08,112.25 -14.87,189.88zm130.78 -107.89l1.53 -0.95 0.35 -0.22c7.57,-4.71 15.41,-9.39 23.53,-14l0.16 -0.09c6.06,-3.44 12.27,-6.86 18.63,-10.22l0.29 -0.16c8.49,-4.49 17.26,-8.91 26.3,-13.23l0.6 -0.29c6.76,-3.22 13.68,-6.39 20.75,-9.5l0.12 -0.05c2.34,-1.03 4.7,-2.05 7.07,-3.06l0.5 -0.21c7,-2.98 14.15,-5.89 21.45,-8.74l1.17 -0.46c2.38,-0.92 4.78,-1.84 7.19,-2.75l0.09 -0.03c5.13,-1.93 10.34,-3.82 15.61,-5.68l0.07 -0.03c-2.61,-6.39 -11.96,-9.39 -26.62,-13.87 -18.07,-5.52 -44.02,-9.54 -92.15,-10.8 -4.31,26.52 -20.49,76.07 -26.62,94.33z"></path></svg>
                </div>
              </>
            )}
          </motion.button>
        </motion.form>

        <p className="text-center text-sm text-text-muted mt-6 relative z-10">
          Already have an account? <Link to="/login" className="text-primary hover:text-primary-dark font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface border border-primary/20 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              {/* Decorative top water drip effect */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />
              
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-text mb-3">Application Submitted</h3>
              
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                {modalMessage}
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition-all shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
              >
                Go to Login Page
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
