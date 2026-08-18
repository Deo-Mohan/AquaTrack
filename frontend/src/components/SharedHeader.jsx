import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Globe, ChevronDown, Search, CheckCheck, Home, Zap, Info, Mail } from 'lucide-react';
import { LANGUAGES as languages, INCLUDED_LANG_CODES } from '../utils/languages';

export default function SharedHeader({ activeTab = 'home' }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [currentLang, setCurrentLang] = useState(() => {
    const saved = localStorage.getItem('selectedLang');
    if (saved) return saved.toUpperCase();

    // First visit: auto-detect browser language
    const browserLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0].toLowerCase();
    const supportedLangs = languages.map(l => l.code);
    if (supportedLangs.includes(browserLang)) {
      localStorage.setItem('selectedLang', browserLang);
      return browserLang.toUpperCase();
    }
    localStorage.setItem('selectedLang', 'en');
    return 'EN';
  });
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [gtReady, setGtReady] = useState(false); // track if GT widget initialized
  const langRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // ─── Google Translate: Eager preload on mount ──────────────────────────────
  // We always load the GT script immediately (not on button click) so it's
  // fully initialized before the user even opens the language dropdown.
  const ensureGoogleTranslate = () => {
    return new Promise((resolve) => {
      if (document.getElementById('google-translate-script')) {
        resolve();
        return;
      }
      window.googleTranslateElementInitLanding = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            { pageLanguage: 'en', includedLanguages: INCLUDED_LANG_CODES, autoDisplay: false },
            'google_translate_element_landing'
          );
        }
        setGtReady(true);
        resolve();
      };
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInitLanding';
      script.async = true;
      script.onerror = () => resolve(); // don't hang on network error
      document.body.appendChild(script);
    });
  };

  // Eagerly load GT on mount AND apply saved/detected language immediately
  useEffect(() => {
    const saved = localStorage.getItem('selectedLang') || 'en';

    // Always preload the GT script in the background for instant readiness
    ensureGoogleTranslate().then(() => {
      if (saved !== 'en') {
        applyLangToCombo(saved);
      }
    });

    // Set cookies for saved language so GT picks it up even before JS runs
    if (saved !== 'en') {
      document.cookie = `googtrans=/en/${saved}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=/en/${saved}; path=/;`;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Apply language to GT combo with retry (no reload) ────────────────────
  const applyLangToCombo = (langCode) => {
    if (langCode === 'en') {
      // Clear cookies to revert to English
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=' + window.location.hostname;
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      const combo = document.querySelector('.goog-te-combo');
      if (combo) { combo.value = 'en'; combo.dispatchEvent(new Event('change')); }
      return;
    }
    let attempts = 0;
    const maxAttempts = 40; // retry for up to 12 seconds
    const interval = setInterval(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event('change'));
        clearInterval(interval);
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 300);
  };

  const changeLanguage = (langCode) => {
    // 1. Update UI immediately (optimistic update, no waiting for GT)
    setCurrentLang(langCode.toUpperCase());
    localStorage.setItem('selectedLang', langCode);
    setLangDropdownOpen(false);
    setLangSearchQuery('');

    // 2. Fire a custom event so same-tab components (e.g. Landing heading) update instantly
    window.dispatchEvent(new CustomEvent('aquatrack-lang-change', { detail: { lang: langCode } }));

    // 3. Set cookies for GT to read
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${langCode}; path=/;`;

    // 4. GT script is already loaded (preloaded on mount) — just dispatch to combo
    ensureGoogleTranslate().then(() => applyLangToCombo(langCode));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const navTabs = [
    { id: 'home',     label: 'Home',     path: '/',         icon: Home,  sectionId: 'hero' },
    { id: 'features', label: 'Features', path: '/features', icon: Zap },
    { id: 'about',   label: 'About',    path: '/about',    icon: Info },
    { id: 'contact', label: 'Contact',  path: '/contact',  icon: Mail },
  ];

  return (
    <>
    <header className="sticky top-0 w-full px-4 sm:px-8 py-3.5 z-50 backdrop-blur-md bg-transparent transition-all">
      <div id="google_translate_element_landing" className="hidden"></div>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between w-full"
      >
        {/* Brand Section at Very Left */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3.5 group">
          <div className="loader loader-responsive">
            <span className="outline-layer">AquaTrack</span>
            <span className="fill-layer">AquaTrack</span>
          </div>
        </Link>

        {/* Navigation Menu Tabs with Framer Motion Animated Moving Underline */}
        <nav className="hidden lg:flex items-center gap-2">
          {[
            { id: 'home', label: 'Home', path: '/', sectionId: 'hero' },
            { id: 'features', label: 'Features', path: '/features' },
            { id: 'about', label: 'About', path: '/about' },
            { id: 'contact', label: 'Contact', path: '/contact' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const handleNavClick = (e) => {
              if (window.location.pathname === '/' && tab.sectionId) {
                const el = document.getElementById(tab.sectionId);
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }
            };
            return (
              <Link
                key={tab.id}
                to={tab.path}
                onClick={handleNavClick}
                className={`relative px-5 py-2 text-sm font-bold transition-colors ${
                  isActive 
                    ? 'text-primary font-extrabold' 
                    : 'text-text/75 hover:text-primary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-primary to-cyan-400 rounded-full shadow-[0_0_12px_rgba(0,120,255,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Language & Theme Controls */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="relative z-50" ref={langRef}>
            <button
              onClick={() => {
                ensureGoogleTranslate();
                setLangDropdownOpen(!langDropdownOpen);
              }}
              className="flex items-center justify-center gap-1.5 w-[36px] h-[36px] md:w-auto md:h-auto sm:px-3 sm:py-2 rounded-full sm:rounded-xl bg-surface hover:bg-surface-lighter border border-border text-xs font-bold text-text transition-all hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:border-primary"
              title="Change Website Language"
            >
              <Globe className="w-4 h-4 text-primary animate-spin-slow" />
              <span className="hidden sm:inline uppercase tracking-wider">{currentLang}</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
            </button>

            {/* Glassmorphic Dropdown Panel */}
            <AnimatePresence>
              {langDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 sm:w-72 max-h-[380px] bg-surface border-2 border-primary/40 rounded-2xl shadow-[0_20px_50px_rgba(0,120,255,0.3)] backdrop-blur-3xl overflow-hidden flex flex-col z-50"
                >
                  <div className="p-3 border-b border-border/80 bg-surface flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-text">Select Language</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {languages.length} Available
                    </span>
                  </div>

                  <div className="p-2 border-b border-border/60 bg-surface">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search language..."
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

                  <div className="flex-1 overflow-y-auto space-y-1 p-1 bg-surface custom-scrollbar">
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

                    {languages
                      .filter((l) => {
                        if (!langSearchQuery) return l.code !== 'en';
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Switcher Toggle */}
          <label htmlFor="switch" className="toggle">
            <input 
              type="checkbox" 
              className="input" 
              id="switch" 
              checked={theme === 'light'} 
              onChange={toggleTheme}
            />
            <div className="icon icon--moon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="icon icon--sun">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path>
              </svg>
            </div>
          </label>
        </div>
      </motion.div>
    </header>

      {/* ── Mobile Bottom Nav Bar (lg:hidden) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 bg-surface/80 backdrop-blur-2xl border-t border-primary/20 shadow-[0_-8px_32px_rgba(0,120,255,0.10)]">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const handleClick = (e) => {
            if (window.location.pathname === '/' && tab.sectionId) {
              const el = document.getElementById(tab.sectionId);
              if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
            }
          };
          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={handleClick}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all select-none ${
                isActive ? 'text-primary' : 'text-text/50 hover:text-text'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(0,120,255,0.8)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
