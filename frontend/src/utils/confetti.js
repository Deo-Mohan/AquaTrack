import confetti from 'canvas-confetti';

export const triggerCelebrationConfetti = () => {
  try {
    const count = 200;
    const defaults = {
      origin: { y: 0.6 },
      zIndex: 99999
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 30,
      startVelocity: 60,
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    });

    fire(0.2, {
      spread: 70,
      colors: ['#38bdf8', '#34d399', '#fbbf24', '#f472b6']
    });

    fire(0.35, {
      spread: 110,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 130,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 140,
      startVelocity: 45,
    });
  } catch (err) {
    console.warn('Confetti trigger error:', err);
  }
};
