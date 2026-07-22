/**
 * AquaTrack Premium Custom Alert Handler
 * Overrides the default window.alert with a premium, animated glassmorphic modal.
 */
export function initCustomAlert() {
  if (typeof window === 'undefined') return;

  window.alert = (message) => {
    // Prevent duplicate alert overlays
    if (document.getElementById('aq-custom-alert-overlay')) {
      return;
    }

    // Determine current theme
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'aq-custom-alert-overlay';
    
    // Base overlay styles
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isLight ? 'rgba(15, 30, 54, 0.18)' : 'rgba(2, 6, 12, 0.55)',
      backdropFilter: 'blur(10px) saturate(180%)',
      webkitBackdropFilter: 'blur(10px) saturate(180%)',
      opacity: '0',
      transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    });

    // Create the modal box (incorporates custom Glassmorphic design tokens)
    const alertBox = document.createElement('div');
    alertBox.id = 'aq-custom-alert-box';
    
    // Base alert box styles
    Object.assign(alertBox.style, {
      padding: '30px 28px',
      width: '90%',
      maxWidth: '420px',
      borderRadius: '24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transform: 'scale(0.85) translateY(-15px)',
      opacity: '0',
      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out',
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    });

    // Apply theme-specific glass style
    if (isLight) {
      Object.assign(alertBox.style, {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        border: '1px solid rgba(59, 130, 246, 0.16)',
        color: '#0b1a30',
        boxShadow: 'inset 0 1.5px 0 0 rgba(255, 255, 255, 0.9), 0 10px 40px rgba(13, 30, 54, 0.08), 0 20px 50px -10px rgba(13, 30, 54, 0.12)',
      });
    } else {
      Object.assign(alertBox.style, {
        backgroundColor: 'rgba(13, 27, 49, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#f8fafc',
        boxShadow: 'inset 0 1.5px 0 0 rgba(255, 255, 255, 0.12), 0 10px 40px rgba(0, 0, 0, 0.35), 0 20px 50px -10px rgba(0, 0, 0, 0.5)',
      });
    }

    // Determine message type (Success, Error, Info) to apply tailored brand accents
    const lowerMsg = message.toLowerCase();
    const isError = lowerMsg.includes('error') || lowerMsg.includes('fail') || lowerMsg.includes('invalid') || lowerMsg.includes('reject') || lowerMsg.includes('denied');
    const isSuccess = lowerMsg.includes('success') || lowerMsg.includes('complete') || lowerMsg.includes('done') || lowerMsg.includes('paid');

    // Accent colors and icons
    let themeColor, themeGradient, iconSvg, titleText;
    if (isError) {
      themeColor = '#ef4444';
      themeGradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)';
      titleText = 'Action Required';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    } else if (isSuccess) {
      themeColor = '#10b981';
      themeGradient = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)';
      titleText = 'Success';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else {
      themeColor = '#3b82f6';
      themeGradient = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)';
      titleText = 'Notification';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
        </svg>
      `;
    }

    // Icon Circle with pulse dynamic animation
    const iconWrapper = document.createElement('div');
    Object.assign(iconWrapper.style, {
      width: '60px',
      height: '60px',
      borderRadius: '20px',
      background: themeGradient,
      border: `1.5px solid rgba(${isError ? '239,68,68' : (isSuccess ? '16,185,129' : '59,130,246')}, 0.25)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
      boxShadow: `0 8px 16px -4px rgba(${isError ? '239,68,68' : (isSuccess ? '16,185,129' : '59,130,246')}, 0.15)`,
      animation: 'aq-bounce-scale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
    });
    iconWrapper.innerHTML = iconSvg;

    // Inject CSS keyframes for custom alert micro-animations if not present
    if (!document.getElementById('aq-alert-keyframes')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'aq-alert-keyframes';
      styleSheet.innerText = `
        @keyframes aq-bounce-scale {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    // Modal Header
    const titleEl = document.createElement('h3');
    titleEl.innerText = titleText;
    Object.assign(titleEl.style, {
      fontSize: '20px',
      fontWeight: '800',
      margin: '0 0 10px 0',
      letterSpacing: '-0.3px',
      background: isLight 
        ? `linear-gradient(135deg, ${themeColor} 0%, #0b1a30 100%)`
        : `linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)`,
      webkitBackgroundClip: 'text',
      webkitTextFillColor: 'transparent',
    });

    // Modal Message
    const msgEl = document.createElement('p');
    msgEl.innerText = message;
    Object.assign(msgEl.style, {
      fontSize: '14.5px',
      lineHeight: '1.6',
      margin: '0 0 26px 0',
      opacity: isLight ? '0.8' : '0.85',
      fontWeight: '500',
      wordBreak: 'break-word',
    });

    // Premium Action Button
    const button = document.createElement('button');
    button.innerText = 'OK';
    Object.assign(button.style, {
      width: '100%',
      padding: '13px 24px',
      borderRadius: '16px',
      background: isError 
        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
        : (isSuccess 
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
          : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'),
      color: '#ffffff',
      border: 'none',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: `0 6px 20px -4px rgba(${isError ? '239,68,68' : (isSuccess ? '16,185,129' : '37,99,235')}, 0.35)`,
      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, filter 0.2s',
      outline: 'none',
      position: 'relative',
      overflow: 'hidden',
    });

    // Hover / Action effects for button
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1.5px)';
      button.style.filter = 'brightness(1.08)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.filter = 'brightness(1)';
    });
    button.addEventListener('mousedown', () => {
      button.style.transform = 'translateY(0.5px)';
    });

    // Dismissal Handler with animation
    const dismissAlert = () => {
      overlay.style.opacity = '0';
      alertBox.style.transform = 'scale(0.9) translateY(12px)';
      alertBox.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 250);
    };

    button.addEventListener('click', dismissAlert);

    // Escape/Enter keyboard shortcut handling
    const keydownHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dismissAlert();
        window.removeEventListener('keydown', keydownHandler);
      }
    };
    window.addEventListener('keydown', keydownHandler);

    // Assembly
    alertBox.appendChild(iconWrapper);
    alertBox.appendChild(titleEl);
    alertBox.appendChild(msgEl);
    alertBox.appendChild(button);
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Trigger opening transitions
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      alertBox.style.transform = 'scale(1) translateY(0)';
      alertBox.style.opacity = '1';
    });

    // Retain keyboard focus on action button
    button.focus();
  };
}
