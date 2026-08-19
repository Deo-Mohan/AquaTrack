import React, { useState, useEffect } from 'react';
import api from '../api';
import { Server, Sparkles, RefreshCw, Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function RenderWarmupBanner() {
  const [isAwake, setIsAwake] = useState(true); // default true to avoid flash
  const [isWaking, setIsWaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timerInterval = null;

    const checkBackendStatus = async () => {
      try {
        // Ping health check endpoint with quick timeout or standard request
        const res = await api.get('/health', { timeout: 6000, skipCache: true }).catch(err => err.response || err);
        
        // If status is 200/OK, backend is awake
        if (res && res.status === 200) {
          setIsAwake(true);
          setIsWaking(false);
          if (timerInterval) clearInterval(timerInterval);
        } else {
          // Backend returned error or failed to respond
          handleSleepingBackend();
        }
      } catch (err) {
        handleSleepingBackend();
      }
    };

    const handleSleepingBackend = () => {
      setIsAwake(false);
      setIsWaking(true);
    };

    // Check health immediately on mount
    checkBackendStatus();

    // Axios interceptors subscription to detect network errors or sleeping backend during app usage
    const reqInterceptor = api.interceptors.request.use((config) => {
      return config;
    });

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        // If an API request succeeds, backend is alive!
        setIsAwake(true);
        setIsWaking(false);
        return response;
      },
      (error) => {
        // Network Error or 502/503/504 Gateway errors typical of sleeping Render free tier
        if (!error.response || [502, 503, 504].includes(error.response?.status) || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
          setIsAwake(false);
          setIsWaking(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, []);

  // Timer logic when waking up
  useEffect(() => {
    let timer;
    if (!isAwake && isWaking) {
      timer = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isAwake, isWaking]);

  // Periodic poll every 5s when sleeping to automatically clear banner when backend wakes up
  useEffect(() => {
    let pollInterval;
    if (!isAwake) {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get('/health', { timeout: 5000, skipCache: true });
          if (res && res.status === 200) {
            setIsAwake(true);
            setIsWaking(false);
          }
        } catch (e) {
          // keep waiting
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [isAwake]);

  const handleManualCheck = async () => {
    setIsRetrying(true);
    try {
      const res = await api.get('/health', { timeout: 8000, skipCache: true });
      if (res && res.status === 200) {
        setIsAwake(true);
        setIsWaking(false);
      }
    } catch (e) {
      // still sleeping
    } finally {
      setIsRetrying(false);
    }
  };

  if (isAwake) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-800 dark:bg-gradient-to-r dark:from-cyan-300 dark:via-sky-300 dark:to-teal-300 text-slate-950 dark:text-slate-950 text-xs sm:text-sm font-medium py-2 px-4 shadow-xl border-b border-cyan-500/40 dark:border-cyan-300/60 flex flex-wrap items-center justify-between gap-3 relative z-[9999] animate-fadeIn overflow-hidden">
      {/* High-contrast animated top border line */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-cyan-400 dark:bg-blue-600 animate-pulse" />
      
      <div className="flex items-center gap-3 flex-1 min-w-[280px] z-10">
        {/* Server status icon with radar pulse */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 dark:bg-slate-950/20 border border-white/20 dark:border-slate-950/30 shrink-0 shadow-sm">
          <Server className="w-4 h-4 text-cyan-200 dark:text-slate-950" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 dark:bg-amber-500 opacity-90"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 dark:bg-amber-500 border-2 border-blue-900 dark:border-cyan-300"></span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-black tracking-wider uppercase text-[11px] sm:text-xs bg-slate-950/80 dark:bg-slate-950/90 border border-slate-900 dark:border-slate-900 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 dark:bg-cyan-300 animate-ping"></span>
            <span className="text-cyan-300 dark:text-cyan-300 font-bold">Backend Waking Up</span>
          </span>
          <p className="text-white dark:text-slate-950 font-semibold text-xs sm:text-sm flex flex-wrap items-center gap-1.5">
            <span>Render free instance is spinning up.</span>
            <span className="font-bold text-white dark:text-slate-950 bg-slate-950/80 dark:bg-slate-950/20 px-2.5 py-0.5 rounded-md border border-white/20 dark:border-slate-950/30 shadow-sm">
              First response takes 30–50s
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-auto z-10">
        {/* Stopwatch timer with inverted background */}
        <div className="flex items-center gap-1.5 bg-slate-950 dark:bg-slate-950 text-cyan-300 dark:text-cyan-300 px-3 py-1 rounded-lg border border-slate-900 dark:border-slate-800 font-mono text-xs font-bold shadow-md">
          <Clock className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-slate-400 dark:text-slate-400 text-[10px] uppercase font-sans">Elapsed:</span>
          <span>{formatTime(elapsed)}</span>
        </div>

        {/* Action button */}
        <button
          onClick={handleManualCheck}
          disabled={isRetrying}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 dark:bg-slate-950 dark:hover:bg-slate-900 text-cyan-300 dark:text-cyan-300 active:scale-95 transition-all text-xs font-bold shadow-lg border border-slate-800 dark:border-slate-800 disabled:opacity-50"
          title="Check backend status now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRetrying ? 'Checking...' : 'Check Status'}</span>
        </button>
      </div>
    </div>
  );
}
