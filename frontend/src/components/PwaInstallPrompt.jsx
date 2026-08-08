import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Smartphone, Monitor, Tablet, CheckCircle2, X, 
  Share, ExternalLink, ShieldCheck, Zap, WifiOff, BellRing, ChevronRight
} from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop'); // 'desktop' | 'mobile' | 'tablet'
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone || 
                         document.referrer.includes('android-app://');

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Listen for native install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissedTime = localStorage.getItem('aquatrack_pwa_banner_dismissed');
      const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000);
      if (!isDismissed) {
        setTimeout(() => setShowBanner(true), 2500);
      }
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setShowModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleOpenModal = () => setShowModal(true);
    window.addEventListener('openPwaInstallModal', handleOpenModal);

    // Auto show popup alert banner on site visit if not recently dismissed
    const dismissedTime = localStorage.getItem('aquatrack_pwa_banner_dismissed');
    const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000); // 24hr cooldown

    const timer = setTimeout(() => {
      if (!isDismissed) {
        setShowBanner(true);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('openPwaInstallModal', handleOpenModal);
    };
  }, []);

  // Handle native browser PWA install trigger
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
        setShowModal(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show full modal with visual device installation guide
      setShowModal(true);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('aquatrack_pwa_banner_dismissed', Date.now().toString());
  };

  if (installed) return null;

  return (
    <>
      {/* FIRST TIME VISITOR ALERT BANNER (Top Floating Glassmorphic Toast) */}
      <AnimatePresence>
        {showBanner && !showModal && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl z-[9999] pointer-events-auto"
          >
            <div className="bg-white/95 dark:bg-slate-950/95 border border-cyan-500/40 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 ring-1 ring-cyan-500/30">
              <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center transition-transform hover:scale-105">
                      <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <h3 className="font-extrabold text-xs sm:text-base tracking-tight text-slate-900 dark:text-white">Install AquaTrack App</h3>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 uppercase tracking-widest shrink-0">
                        PWA App
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                      Fast desktop & mobile access with offline support.
                    </p>
                  </div>
                </div>

                <button
                  onClick={dismissBanner}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer sm:hidden shrink-0"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-cyan-500/30 border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download App</span>
                </button>
                <button
                  onClick={dismissBanner}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer hidden sm:flex shrink-0"
                  title="Dismiss alert"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL BEAUTIFUL INSTALLATION SHOWCASE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-6 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#071324] border border-slate-200 dark:border-cyan-500/30 rounded-2xl sm:rounded-3xl max-w-4xl w-full text-slate-800 dark:text-white shadow-2xl overflow-hidden relative flex flex-col max-h-[86vh] sm:max-h-[92vh] my-auto"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-100 via-sky-50 to-blue-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-3 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between relative overflow-hidden shrink-0">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-2.5 sm:gap-3.5 z-10 min-w-0">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/30 flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="AquaTrack" className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      Install AquaTrack App
                    </h2>
                    <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate">
                      {deviceType === 'mobile' ? 'Smartphone installation guide' : deviceType === 'tablet' ? 'Tablet installation guide' : 'Desktop cross-platform experience'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-white/10 transition-all cursor-pointer z-10 shrink-0 ml-2"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 custom-scrollbar min-h-0">
                
                {/* Device Mockup Showcase Frame */}
                <div className="relative bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 overflow-hidden flex flex-col items-center justify-center min-h-[210px] sm:min-h-[320px] shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

                  {/* DESKTOP PREVIEW */}
                  {deviceType === 'desktop' && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-2xl flex flex-col items-center space-y-3"
                    >
                      <div className="w-full bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="bg-slate-300 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-4 sm:px-6 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold truncate max-w-[200px] sm:max-w-xs">
                            https://aquatrack.app/dashboard
                          </div>
                          <div className="w-8 sm:w-12" />
                        </div>
                        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                          <img 
                            src="/pwa_desktop_preview.png" 
                            alt="AquaTrack Desktop App" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-center">
                        <Monitor className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        Native 4K Ultrawide & Multi-Monitor Desktop Support
                      </span>
                    </motion.div>
                  )}

                  {/* SMARTPHONE PREVIEW */}
                  {deviceType === 'mobile' && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center space-y-2"
                    >
                      <div className="w-44 sm:w-64 bg-slate-800 dark:bg-slate-900 border-4 border-slate-400 dark:border-slate-700 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl p-1.5 relative ring-1 ring-cyan-500/30">
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 sm:w-20 h-3 sm:h-4 bg-slate-950 rounded-full z-20" />
                        
                        <div className="relative aspect-[9/18] w-full rounded-[24px] sm:rounded-[32px] bg-slate-950 overflow-hidden">
                          <img 
                            src="/pwa_mobile_preview.png" 
                            alt="AquaTrack Smartphone App" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-center">
                        <Smartphone className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        Touch-Optimized Mobile Interface for iOS & Android
                      </span>
                    </motion.div>
                  )}

                  {/* TABLET PREVIEW */}
                  {deviceType === 'tablet' && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-xl flex flex-col items-center space-y-3"
                    >
                      <div className="w-full bg-slate-800 dark:bg-slate-900 border-6 sm:border-8 border-slate-300 dark:border-slate-800 rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl p-2 relative ring-1 ring-cyan-500/30">
                        <div className="relative aspect-[4/3] w-full rounded-[16px] sm:rounded-[20px] bg-slate-950 overflow-hidden">
                          <img 
                            src="/pwa_tablet_preview.png" 
                            alt="AquaTrack Tablet App" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-center">
                        <Tablet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        Adaptive Tablet Dashboard for On-the-go Community Admins
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Feature Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-0.5">Instant Launch</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Launches from taskbar or home screen in under 0.2s without browser delays.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <WifiOff className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-0.5">Offline Ready</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Access core records, saved meter receipts & support tickets offline.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-0.5">Push Alerts</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Receive real-time bill issue alerts, tanker dispatch updates & reminders.</p>
                    </div>
                  </div>
                </div>

                {/* Device-Tailored Quick Installation Steps Box */}
                <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> 
                    Installation Guide ({deviceType === 'mobile' ? 'Smartphone' : deviceType === 'tablet' ? 'Tablet' : 'Desktop'})
                  </h4>
                  
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    {deviceType === 'desktop' && (
                      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-cyan-500/20 space-y-2">
                        <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-2 text-sm">
                          <Monitor className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Desktop Installation (Chrome / Edge / Brave / Safari Mac):
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          1. Click the <strong className="text-slate-900 dark:text-white bg-cyan-500/10 dark:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">Install AquaTrack App Now</strong> button below.<br />
                          2. OR click the installation icon <strong className="text-cyan-600 dark:text-cyan-400 font-bold">⊕</strong> on the right side of your browser URL address bar.<br />
                          3. Confirm <strong className="text-slate-900 dark:text-white">Install</strong> to pin AquaTrack to your desktop taskbar & start menu.
                        </p>
                      </div>
                    )}

                    {deviceType === 'mobile' && (
                      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-cyan-500/20 space-y-2.5">
                        <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-2 text-sm">
                          <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Smartphone Installation (iOS & Android):
                        </span>
                        <div className="space-y-2 text-slate-600 dark:text-slate-300">
                          <div className="bg-slate-100/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-cyan-600 dark:text-cyan-300 mb-0.5">🍏 iPhone (iOS Safari):</p>
                            <p>Tap the <Share className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 inline mx-0.5" /> <strong className="text-slate-900 dark:text-white">Share</strong> icon at the bottom of Safari, scroll down and tap <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Add to Home Screen</strong>.</p>
                          </div>
                          <div className="bg-slate-100/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-cyan-600 dark:text-cyan-300 mb-0.5">🤖 Android (Chrome / Brave):</p>
                            <p>Tap the <strong className="text-slate-900 dark:text-white font-mono text-sm">⋮</strong> menu in Chrome top-right corner and select <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Install App</strong> or <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Add to Home Screen</strong>.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {deviceType === 'tablet' && (
                      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-cyan-500/20 space-y-2.5">
                        <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-2 text-sm">
                          <Tablet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Tablet Installation (iPadOS & Android Tablets):
                        </span>
                        <div className="space-y-2 text-slate-600 dark:text-slate-300">
                          <div className="bg-slate-100/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-cyan-600 dark:text-cyan-300 mb-0.5">📱 iPad (Safari):</p>
                            <p>Tap the <Share className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 inline mx-0.5" /> <strong className="text-slate-900 dark:text-white">Share</strong> icon in the top toolbar, then tap <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Add to Home Screen</strong>.</p>
                          </div>
                          <div className="bg-slate-100/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-cyan-600 dark:text-cyan-300 mb-0.5">🤖 Android Tablet (Chrome):</p>
                            <p>Click the <strong className="text-cyan-600 dark:text-cyan-400 font-bold">⊕ Install</strong> icon in the URL bar or open Chrome menu <strong className="text-slate-900 dark:text-white font-mono text-sm">⋮</strong> and tap <strong className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Install App</strong>.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer / Primary Call to Action */}
              <div className="bg-slate-100 dark:bg-slate-950 p-3 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>100% Free, Secure & Enterprise Validated Web App</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-extrabold text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 transition-all cursor-pointer text-center shrink-0"
                  >
                    Close
                  </button>

                  <button
                    onClick={handleInstallClick}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm px-4 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl shadow-cyan-500/30 border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer truncate"
                  >
                    <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] shrink-0" />
                    <span className="truncate">Install AquaTrack App</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
