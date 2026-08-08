import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JellyBlobMascot, BlobSpeech } from 'feral-blob';
import 'feral-blob/blob.css';
import { X, LogOut, ShieldCheck, Droplets, Sparkles, UserCheck } from 'lucide-react';

const PALETTES = [
  {
    id: 'aqua',
    name: 'Aqua Water',
    bg: '#38bdf8',
    styles: {
      '--jelly-body-top': '#7dd3fc',
      '--jelly-body-mid': '#0284c7',
      '--jelly-body-deep': '#0369a1',
      '--jelly-body-rim': '#38bdf8',
      '--jelly-outline': '#075985',
      '--jelly-outline-light': '#0284c7',
      '--jelly-arm-light': '#bae6fd',
      '--jelly-arm-mid': '#38bdf8',
      '--jelly-arm-deep': '#0284c7',
      '--jelly-cheek-light': '#a5f3fc',
      '--jelly-cheek': '#38bdf8',
      '--jelly-cheek-deep': '#0284c7',
      '--jelly-eye-light': '#0c4a6e',
      '--jelly-eye': '#082f49',
      '--jelly-eye-deep': '#031926',
      '--jelly-belly-glow': '#e0f2fe',
      '--jelly-eye-sparkle': '#38bdf8'
    }
  },
  {
    id: 'purple',
    name: 'Violet Glow',
    bg: '#c084fc',
    styles: {
      '--jelly-body-top': '#ecb8ff',
      '--jelly-body-mid': '#c57af3',
      '--jelly-body-deep': '#a662e8',
      '--jelly-body-rim': '#d292fb',
      '--jelly-outline': '#8d52de',
      '--jelly-outline-light': '#b66af0',
      '--jelly-arm-light': '#e1a8ff',
      '--jelly-arm-mid': '#bc78ed',
      '--jelly-arm-deep': '#9c5de2',
      '--jelly-cheek-light': '#ffc5e2',
      '--jelly-cheek': '#f68fc8',
      '--jelly-cheek-deep': '#e87cb9',
      '--jelly-eye-light': '#37204b',
      '--jelly-eye': '#170d25',
      '--jelly-eye-deep': '#0d0715',
      '--jelly-belly-glow': '#ffb2dc',
      '--jelly-eye-sparkle': '#b471e6'
    }
  },
  {
    id: 'emerald',
    name: 'Eco Mint',
    bg: '#34d399',
    styles: {
      '--jelly-body-top': '#6ee7b7',
      '--jelly-body-mid': '#059669',
      '--jelly-body-deep': '#047857',
      '--jelly-body-rim': '#34d399',
      '--jelly-outline': '#065f46',
      '--jelly-outline-light': '#10b981',
      '--jelly-arm-light': '#a7f3d0',
      '--jelly-arm-mid': '#34d399',
      '--jelly-arm-deep': '#059669',
      '--jelly-cheek-light': '#fef08a',
      '--jelly-cheek': '#facc15',
      '--jelly-cheek-deep': '#eab308',
      '--jelly-eye-light': '#064e3b',
      '--jelly-eye': '#022c22',
      '--jelly-eye-deep': '#012018',
      '--jelly-belly-glow': '#d1fae5',
      '--jelly-eye-sparkle': '#34d399'
    }
  },
  {
    id: 'coral',
    name: 'Sunset Coral',
    bg: '#f87171',
    styles: {
      '--jelly-body-top': '#fca5a5',
      '--jelly-body-mid': '#ef4444',
      '--jelly-body-deep': '#dc2626',
      '--jelly-body-rim': '#f87171',
      '--jelly-outline': '#b91c1c',
      '--jelly-outline-light': '#ef4444',
      '--jelly-arm-light': '#fecaca',
      '--jelly-arm-mid': '#f87171',
      '--jelly-arm-deep': '#dc2626',
      '--jelly-cheek-light': '#fed7aa',
      '--jelly-cheek': '#fb923c',
      '--jelly-cheek-deep': '#f97316',
      '--jelly-eye-light': '#7f1d1d',
      '--jelly-eye': '#450a0a',
      '--jelly-eye-deep': '#180202',
      '--jelly-belly-glow': '#fecaca',
      '--jelly-eye-sparkle': '#f87171'
    }
  },
  {
    id: 'gold',
    name: 'Gold',
    bg: '#fbbf24',
    styles: {
      '--jelly-body-top': '#fde047',
      '--jelly-body-mid': '#eab308',
      '--jelly-body-deep': '#ca8a04',
      '--jelly-body-rim': '#facc15',
      '--jelly-outline': '#a16207',
      '--jelly-outline-light': '#eab308',
      '--jelly-arm-light': '#fef08a',
      '--jelly-arm-mid': '#facc15',
      '--jelly-arm-deep': '#ca8a04',
      '--jelly-cheek-light': '#fed7aa',
      '--jelly-cheek': '#fb923c',
      '--jelly-cheek-deep': '#f97316',
      '--jelly-eye-light': '#713f12',
      '--jelly-eye': '#451a03',
      '--jelly-eye-deep': '#1c0a00',
      '--jelly-belly-glow': '#fef08a',
      '--jelly-eye-sparkle': '#facc15'
    }
  }
];

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  const fullUsername = localStorage.getItem('username') || 'Resident';
  const firstName = fullUsername.split(' ')[0] || fullUsername;
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  // Manage speech bubble text dynamically without stale closures
  const getInitialPhrase = (name) => `Going somewhere, ${name}?`;

  const [mood, setMood] = useState('neutral');
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [activeEyeFilter, setActiveEyeFilter] = useState(null);
  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);

  useEffect(() => {
    if (isOpen) {
      setMood('neutral');
      setGaze({ x: 0, y: 0 });
      setCurrentSpeech(getInitialPhrase(capitalizedFirstName));
      setActiveEyeFilter(null);
    }
  }, [isOpen, capitalizedFirstName]);

  const handleCancelHover = () => {
    setMood('happy');
    setGaze({ x: -14, y: 2 });
    setCurrentSpeech('Yay, stay with me!');
  };

  const handleConfirmHover = () => {
    setMood('sad');
    setGaze({ x: 14, y: -4 });
  };

  const handleResetHover = () => {
    if (activeEyeFilter) {
      if (activeEyeFilter === 'smile') {
        setMood('happy');
        setGaze({ x: 0, y: 0 });
        setCurrentSpeech('Yay, stay with me!');
      } else if (activeEyeFilter === 'hmm') {
        setMood('hmm');
        setGaze({ x: 0, y: 0 });
        setCurrentSpeech('Hmm... really?');
      } else if (activeEyeFilter === 'sideEye') {
        setMood('sideEye');
        setGaze({ x: 15, y: -2 });
        setCurrentSpeech('...seriously?');
      }
    } else {
      setMood('neutral');
      setGaze({ x: 0, y: 0 });
      setCurrentSpeech(getInitialPhrase(capitalizedFirstName));
    }
  };

  const handleFilterHover = (type) => {
    setActiveEyeFilter(type);
    if (type === 'smile') {
      setMood('happy');
      setGaze({ x: 0, y: 0 });
      setCurrentSpeech('Yay, stay with me!');
    } else if (type === 'hmm') {
      setMood('hmm');
      setGaze({ x: 0, y: 0 });
      setCurrentSpeech('Hmm... really?');
    } else if (type === 'sideEye') {
      setMood('sideEye');
      setGaze({ x: 15, y: -2 });
      setCurrentSpeech('...seriously?');
    }
  };

  const handleFilterLeave = () => {
    setActiveEyeFilter(null);
    setMood('neutral');
    setGaze({ x: 0, y: 0 });
    setCurrentSpeech(getInitialPhrase(capitalizedFirstName));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Ambient Aqua Backdrops & Blur Rings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#071324]/80 backdrop-blur-xl"
        />

        <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
          {/* Top Theme Palette Swatches */}
          <motion.div 
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3.5 mb-5"
          >
            {PALETTES.map((palette) => {
              const isSelected = selectedPalette.id === palette.id;
              return (
                <button
                  key={palette.id}
                  onClick={() => setSelectedPalette(palette)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 cursor-pointer relative flex items-center justify-center border-2 ${
                    isSelected ? 'border-primary scale-110 shadow-lg ring-2 ring-primary/40' : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: palette.bg }}
                  title={`${palette.name} Palette`}
                />
              );
            })}
          </motion.div>

          {/* Neumorphic Tactile Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full bg-surface rounded-3xl p-7 sm:p-9 text-text overflow-hidden shadow-[12px_12px_30px_rgba(0,0,0,0.45),-8px_-8px_25px_rgba(255,255,255,0.03)] border border-white/5"
          >
            {/* Soft Ambient Radial Glow Behind Mascot */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-surface-lighter hover:bg-border text-text-muted hover:text-text transition-colors cursor-pointer z-20 border border-border/50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Feral Blob & Speech Bubble Container */}
            <div 
              className="flex flex-col items-center justify-center my-1 relative"
              style={selectedPalette.styles}
            >
              {/* Native Speech Cloud using official BlobSpeech mood & messages props */}
              <div className="mb-2 z-20 min-h-[56px] px-4 flex items-center justify-center">
                <BlobSpeech
                  mood={mood}
                  messages={{
                    neutral: `Going somewhere, ${capitalizedFirstName}?`,
                    happy: 'Yay, stay with me!',
                    hmm: 'Hmm… really?',
                    sideEye: '…seriously?',
                    sad: "Aww, don't go…"
                  }}
                />
              </div>

              {/* Feral Blob Mascot SVG (44px scale) */}
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center cursor-pointer relative z-10">
                <JellyBlobMascot
                  mood={mood}
                  gaze={gaze}
                  happyEyes="smile"
                />
              </div>
            </div>

            {/* User Session Farewell & Confirmation Text */}
            <div className="text-center mt-3 mb-6 relative z-10">
              <h3 className="heading text-2xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center justify-center gap-2">
                Log Out of AquaTrack?
              </h3>
              <p className="text-xs sm:text-sm text-text-muted mt-1.5 font-medium leading-relaxed px-2">
                Your water analytics and consumption history are safely saved in the cloud.
              </p>
            </div>



            {/* Action Buttons: Cancel vs Logout (Animated Neumorphic Soft Raised Buttons) */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                onMouseEnter={handleCancelHover}
                onMouseLeave={handleResetHover}
                className="py-3.5 px-5 rounded-2xl bg-surface-lighter hover:bg-emerald-500/20 text-text hover:text-emerald-700 dark:hover:text-emerald-300 font-extrabold text-sm sm:text-base border border-border/40 hover:border-emerald-500/50 transition-colors duration-200 cursor-pointer text-center shadow-[5px_5px_12px_rgba(0,0,0,0.15),-3px_-3px_10px_rgba(255,255,255,0.7)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.35),-3px_-3px_10px_rgba(255,255,255,0.03)]"
              >
                Stay Logged In
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={onConfirm}
                onMouseEnter={handleConfirmHover}
                onMouseLeave={handleResetHover}
                className="py-3.5 px-5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-extrabold text-sm sm:text-base border border-red-500/40 hover:border-red-500/70 transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2 shadow-[4px_4px_12px_rgba(239,68,68,0.25),-2px_-2px_8px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_14px_rgba(239,68,68,0.3),-2px_-2px_8px_rgba(255,255,255,0.03)]"
              >
                <LogOut className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>Log Out</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom Interactive Expression Filter Pills (Animated Neumorphic Inset Tray) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-surface/90 border border-border/50 p-1.5 sm:p-2 rounded-2xl flex items-center gap-2 shadow-[6px_6px_16px_rgba(0,0,0,0.4),-4px_-4px_12px_rgba(255,255,255,0.02)] backdrop-blur-md"
          >
            {[
              { id: 'smile', label: 'Smile eyes' },
              { id: 'hmm', label: 'Hmm' },
              { id: 'sideEye', label: 'Side eye' }
            ].map((filter) => {
              const isActive = activeEyeFilter === filter.id;
              return (
                <motion.button
                  key={filter.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => handleFilterHover(filter.id)}
                  onMouseLeave={handleFilterLeave}
                  className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white font-bold shadow-lg shadow-primary/30'
                      : 'text-text-muted hover:text-text hover:bg-surface-lighter'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--jelly-body-mid, #0284c7)',
                          borderColor: 'var(--jelly-outline, #0369a1)'
                        }
                      : {}
                  }
                >
                  {filter.label}
                </motion.button>
              );
            })}
          </motion.div>

          <p className="text-[11px] sm:text-xs text-text-muted font-semibold mt-3 text-center">
            Hover over the pills above to interact with your Aqua Mascot!
          </p>
        </div>
      </div>
    </AnimatePresence>
  );
}
