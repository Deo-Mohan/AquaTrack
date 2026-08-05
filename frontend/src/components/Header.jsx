import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, Sun, Moon, Bell, CheckCheck, Trash2, Globe, ChevronDown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { LANGUAGES as languages, INCLUDED_LANG_CODES } from '../utils/languages';
import { groupNotificationsByDate, formatNotificationTime } from '../utils/dateGrouper';

// Gender-based SVG avatar component
const UserAvatar = ({ gender, role, size = 40 }) => {
  if (gender?.toLowerCase() === 'female') {
    return (
      <svg width={size} height={size} viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg" className="rounded-full">
        <g data-name="Layer 2"><g data-name="Female Avatar">
          <circle fill="#58b0e0" r="30.9" cy="30.9" cx="30.9" />
          <path d="M45.487 19.987l-29.173.175s1.048 16.148-2.619 21.21h35.701c-.92-1.35-3.353-1.785-3.909-21.385z" fillRule="evenodd" fill="#60350a" />
          <path d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z" fillRule="evenodd" fill="#d5e1ed" />
          <path d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z" fillRule="evenodd" fill="#f9dca4" />
          <path opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z" fillRule="evenodd" />
          <path d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z" fillRule="evenodd" fill="#434955" />
          <path d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z" fillRule="evenodd" fill="#ffe8be" />
          <path d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 01-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 001.419-7.384z" fillRule="evenodd" fill="#f9dca4" />
          <path d="M17.89 25.608c0-.638.984-.886 1.598 2.943a22.164 22.164 0 0 0 .956-4.813c1.162.225 2.278 2.848 1.927 5.148 3.166-.777 11.303-5.687 13.949-12.324 6.772 3.901 6.735 12.094 6.735 12.094s.358-1.9.558-3.516c.066-.538.293-.733.798-.213C48.073 17.343 42.3 5.75 31.297 5.57c-15.108-.246-17.03 16.114-13.406 20.039z" fillRule="evenodd" fill="#8a5c42" />
          <path d="M24.765 42.431a14.125 14.125 0 0 0 6.463 5.236l-4.208 6.144-5.917-9.78z" fillRule="evenodd" fill="#fff" />
          <path d="M37.682 42.431a14.126 14.126 0 0 1-6.463 5.236l4.209 6.144 5.953-9.668z" fillRule="evenodd" fill="#fff" />
        </g></g>
      </svg>
    );
  }

  // Male Admin specific custom image
  if ((!gender || gender.toLowerCase() === 'male') && role === 'ROLE_ADMIN') {
    return (
      <img src="/male_admin.png" alt="Admin Avatar" className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }

  // Male Household / Community Admin custom image
  if ((!gender || gender.toLowerCase() === 'male') && role !== 'ROLE_ADMIN') {
    return (
      <img src="/male_03.svg" alt="User Avatar" className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }

  // Female custom image
  if (gender && gender.toLowerCase() === 'female') {
    return (
      <img src="/female_05.svg" alt="Female Avatar" className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }

  // Male / default avatar
  return (
    <svg width={size} height={size} viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg" className="rounded-full">
      <g data-name="Layer 2"><g data-name="Male Avatar">
        <circle fill="#58b0e0" r="30.9" cy="30.9" cx="30.9" />
        <path d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z" fillRule="evenodd" fill="#2c3e50" />
        <path d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z" fillRule="evenodd" fill="#ecf0f1" />
        <path d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z" fillRule="evenodd" fill="#f9dca4" />
        <path opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z" fillRule="evenodd" />
        <path d="M29.5 45.5l2.8-1.5 2.8 1.5-1.5 12h-2.6l-1.5-12z" fill="#e74c3c" />
        <path d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z" fillRule="evenodd" fill="#ffe8be" />
        <path d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 01-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 001.419-7.384z" fillRule="evenodd" fill="#f9dca4" />
        <path d="M17.89 25.608c0-5.6 4.98-15.8 13.4-15.8 8.42 0 13.4 10.2 13.4 15.8-2-8-6.5-11.5-13.4-11.5-6.9 0-11.4 3.5-13.4 11.5z" fillRule="evenodd" fill="#34495e" />
        <path d="M44.7 20.8c-3-8.5-8.5-14.5-13.6-14.5-5.1 0-10.6 6-13.6 14.5 2-4 6-7.5 13.6-7.5 7.6 0 11.6 3.5 13.6 7.5z" fill="#2c3e50" />
        <circle fill="#2c3e50" r="1.5" cy="24.5" cx="26.2" />
        <circle fill="#2c3e50" r="1.5" cy="24.5" cx="36.2" />
        <path d="M27 34c1 1 3 1.5 4 1.5s3-.5 4-1.5c0 1-2 2-4 2s-4-1-4-2z" fill="#34495e" />
      </g></g>
    </svg>
  );
};

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  });

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const bellRef = useRef(null);

  const username = localStorage.getItem('username') || 'Guest';
  const role = localStorage.getItem('role') || '';
  const [gender, setGender] = useState(() => localStorage.getItem('gender') || 'Male');
  const [langSearchQuery, setLangSearchQuery] = useState('');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Sync profile gender from API & storage events
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || username === 'Guest') return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchGender = async () => {
      try {
        const res = await api.get(`/users/profile/${username}`);
        if (res.data && res.data.gender) {
          setGender(res.data.gender);
          localStorage.setItem('gender', res.data.gender);
        }
      } catch (err) {
        console.error("Error fetching profile gender for header:", err);
      }
    };
    fetchGender();

    const handleProfileUpdate = () => {
      setGender(localStorage.getItem('gender') || 'Male');
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [username]);

  // Fetch unread count on mount and on interval
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || username === 'Guest') return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get(`/notifications/${username}/unread-count`);
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        console.error('Error fetching unread count', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [username]);

  // Fetch full notifications when bell is opened
  const handleBellClick = async () => {
    setBellOpen(prev => !prev);
    if (!bellOpen) {
      setLoadingNotifs(true);
      try {
        const res = await api.get(`/notifications/${username}`);
        setNotifications(res.data || []);
      } catch (err) {
        console.error('Error fetching notifications', err);
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.put(`/notifications/${username}/read-all`);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  // Delete all notifications
  const handleDeleteAll = async () => {
    try {
      await api.delete(`/notifications/delete-all/${username}`);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error deleting all notifications', err);
    }
  };

  // Mark single as read
  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read', err);
    }
  };

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  // Notification type colors
  const getTypeStyle = (type) => {
    switch (type) {
      case 'APPROVAL_REQUEST': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OVERUSE_ALERT': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'LEAK_DETECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'BILL_GENERATED': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'PAYMENT_REMINDER': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'APPROVAL_REQUEST': return 'Approval';
      case 'OVERUSE_ALERT': return 'Overuse';
      case 'LEAK_DETECTED': return 'Leak';
      case 'BILL_GENERATED': return 'Bill';
      case 'PAYMENT_REMINDER': return 'Payment';
      case 'SYSTEM': return 'System';
      default: return type || 'Info';
    }
  };

  // Google Translate Integration for Universal & Indian Languages
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('selectedLang') || 'en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: INCLUDED_LANG_CODES,
              autoDisplay: false,
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
            },
            'google_translate_element'
          );
        }
      };

      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }

    // Mutation Observer to permanently kill & hide the Google Translate top banner iframe
    const observer = new MutationObserver(() => {
      const bannerFrame = document.querySelector('.goog-te-banner-frame, iframe[id=":1.container"]');
      if (bannerFrame && bannerFrame.style.display !== 'none') {
        bannerFrame.style.display = 'none';
        bannerFrame.style.visibility = 'hidden';
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const changeLanguage = (langCode) => {
    setCurrentLang(langCode);
    localStorage.setItem('selectedLang', langCode);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang: langCode } }));
    setLangDropdownOpen(false);

    // Trigger Google Translate frame combo switch if ready
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event('change'));
    } else {
      // Fallback setting cookie directly
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      window.location.reload();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleLangClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleLangClickOutside);
    return () => document.removeEventListener('mousedown', handleLangClickOutside);
  }, []);

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 lg:h-24 flex items-center justify-between px-4 lg:px-8 border-b border-border/50 bg-surface/50 backdrop-blur-xl relative z-30"
    >
      {/* Hidden Google Translate container */}
      <div id="google_translate_element" className="hidden" />

      <div className="flex items-center gap-2 lg:gap-4">
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-lighter rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-10 h-10 lg:w-20 lg:h-20 rounded-full overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 flex items-center justify-center bg-surface flex-shrink-0">
            <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="loader loader-responsive">
            <span className="outline-layer">AquaTrack</span>
            <span className="fill-layer">AquaTrack</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-6">

        {/* Universal & Indian Language Selector with Globe Icon */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-surface/80 hover:bg-surface-lighter border border-border/70 text-xs font-bold text-text transition-all hover:scale-105 shadow-sm"
            title="Change Website Language"
          >
            <Globe className="w-4 h-4 text-primary animate-spin-slow" />
            <span className="hidden sm:inline uppercase tracking-wider">{currentLang}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
          </button>

          <AnimatePresence>
            {langDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-hidden flex flex-col bg-surface border border-primary/40 rounded-2xl shadow-2xl z-[9999] p-2 backdrop-blur-3xl"
              >
                {/* Header & Search Bar */}
                <div className="p-2 border-b border-border bg-surface">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-primary mb-2 flex items-center justify-between">
                    <span>🌐 Select Language</span>
                    <span className="text-[9px] font-bold text-primary/90 px-1.5 py-0.5 rounded-full bg-primary/10">{languages.length} Available</span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search language (e.g. Hindi, English)..."
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      className="w-full bg-surface-lighter text-text text-xs rounded-xl pl-8 pr-3 py-1.5 border border-border/80 focus:outline-none focus:border-primary/80 transition-all placeholder:text-text-muted/60"
                      autoFocus
                    />
                    {langSearchQuery && (
                      <button
                        onClick={() => setLangSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Language Items List */}
                <div className="flex-1 overflow-y-auto space-y-1 p-1 bg-surface custom-scrollbar">
                  {/* Pinned English (Default) Option on Top when not searching */}
                  {!langSearchQuery && (
                    <div className="mb-2 pb-1.5 border-b border-border/50">
                      <div className="px-2 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">Pinned Top</div>
                      {languages.filter(l => l.code === 'en').map((l) => (
                        <button
                          key={l.code}
                          onClick={() => changeLanguage(l.code)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            currentLang === l.code
                              ? 'bg-primary/20 text-primary font-bold shadow-xs border border-primary/30'
                              : 'text-text hover:bg-surface-lighter'
                          }`}
                        >
                          <span className="notranslate flex items-center gap-2">
                            <span className="text-base">{l.flag}</span>
                            <span className="font-bold">{l.name}</span>
                          </span>
                          {currentLang === l.code && <CheckCheck className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Filtered Languages List */}
                  {languages
                    .filter((l) => {
                      if (!langSearchQuery) return l.code !== 'en'; // English already shown above
                      const q = langSearchQuery.toLowerCase();
                      return l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
                    })
                    .map((l) => (
                      <button
                        key={l.code}
                        onClick={() => changeLanguage(l.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          currentLang === l.code
                            ? 'bg-primary/20 text-primary font-bold shadow-xs border border-primary/30'
                            : 'text-text hover:bg-surface-lighter'
                        }`}
                      >
                        <span className="notranslate flex items-center gap-2">
                          <span className="text-base">{l.flag}</span>
                          <span>{l.name}</span>
                        </span>
                        {currentLang === l.code && <CheckCheck className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}

                  {/* Empty Search Result */}
                  {languages.filter(l => l.name.toLowerCase().includes(langSearchQuery.toLowerCase()) || l.code.toLowerCase().includes(langSearchQuery.toLowerCase())).length === 0 && (
                    <div className="py-6 text-center text-xs text-text-muted font-medium">
                      No matching language found for "{langSearchQuery}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PWA Download Quick Trigger Button (Hidden on smartphone screens) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openPwaInstallModal'))}
          className="hidden sm:flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 border border-cyan-500/35 text-xs font-extrabold text-cyan-600 dark:text-cyan-400 transition-all hover:scale-105 shadow-sm cursor-pointer"
          title="Download & Install AquaTrack App"
        >
          <Download className="w-4 h-4 text-cyan-500 stroke-[2.5]" />
          <span className="hidden sm:inline">App</span>
        </button>


        <label htmlFor="header-switch" className="toggle">
          <input 
            type="checkbox" 
            className="input" 
            id="header-switch" 
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

        {/* Notification Bell */}
        <div className="relative" ref={bellRef}>
          <button onClick={handleBellClick} className="bell-button">
            <svg viewBox="0 0 448 512" className="bell">
              <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full ring-2 ring-surface text-white text-[10px] font-bold px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-full mt-3 w-auto sm:w-96 max-h-[480px] bg-[#f0f9ff] dark:bg-[#071324] border-2 border-primary/50 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden z-[9999] notification-dropdown"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-text text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button 
                        onClick={handleDeleteAll}
                        title="Delete all notifications"
                        className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
                  {loadingNotifs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                      <Bell className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No notifications yet</p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    groupNotificationsByDate(notifications).map((group, gIdx) => (
                      <div key={gIdx}>
                        {/* Section Header */}
                        <div className="px-4 py-1.5 bg-surface-lighter/80 dark:bg-slate-900/80 border-y border-border/40 text-[11px] font-black text-primary uppercase tracking-wider flex items-center justify-between">
                          <span>{group.dateLabel}</span>
                          <span className="text-[9px] font-medium text-text-muted">{group.items.length} alert(s)</span>
                        </div>
                        {group.items.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.isRead) handleMarkRead(notif.id);
                              setBellOpen(false);
                              navigate('/notifications');
                            }}
                            className={`px-5 py-3.5 border-b border-border/40 transition-colors cursor-pointer ${
                              notif.isRead 
                                ? 'bg-white dark:bg-[#071324] hover:bg-slate-50 dark:hover:bg-[#0f2442]' 
                                : 'bg-slate-50 dark:bg-[#0d223f] hover:bg-slate-100 dark:hover:bg-[#122b52] border-l-4 border-l-primary'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {!notif.isRead && (
                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getTypeStyle(notif.type)}`}>
                                    {getTypeLabel(notif.type)}
                                  </span>
                                </div>
                                <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-text-muted' : 'text-text'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                  {notif.message}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-text-muted whitespace-nowrap flex-shrink-0 mt-1">
                                {formatNotificationTime(notif.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-border mx-1 hidden sm:block"></div>

        {/* User Profile - Gender-based Avatar (Visible on tablet & desktop) */}
        <div 
          onClick={() => navigate('/profile')}
          title="Click to view & edit your profile"
          className="hidden sm:flex items-center gap-3 cursor-pointer group hover:scale-105 transition-all"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-text group-hover:text-primary transition-colors capitalize" lang="en">
              {username}
            </p>
            <p className="text-xs text-text-muted">
              {role === 'ROLE_ADMIN' ? 'Admin' : 
               role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Household User'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-border group-hover:border-primary transition-colors overflow-hidden flex-shrink-0 shadow-sm">
            <UserAvatar gender={gender} role={role} size={40} />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
