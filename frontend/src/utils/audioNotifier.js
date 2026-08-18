/**
 * Audio Notifier Utility for AquaTrack
 * Sound File: /mixkit-water-bubble-1317.wav (stored in public/)
 * Controls playback based on user preference in localStorage ('aquatrack_sound_enabled')
 */

export const isSoundEnabled = () => {
  const saved = localStorage.getItem('aquatrack_sound_enabled');
  return saved !== null ? saved === 'true' : true;
};

export const setSoundEnabled = (enabled) => {
  localStorage.setItem('aquatrack_sound_enabled', enabled ? 'true' : 'false');
};

export const playNotificationSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/mixkit-water-bubble-1317.wav');
    audio.volume = 0.8;
    audio.play().catch(err => {
      // Audio autoplay policy warning (user interaction required)
      console.warn('Notification audio playback deferred by browser policy:', err);
    });
  } catch (err) {
    console.error('Error playing notification sound:', err);
  }
};
