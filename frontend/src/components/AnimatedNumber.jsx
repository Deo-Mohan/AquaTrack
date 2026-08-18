import React, { useState, useEffect } from 'react';

/**
 * AnimatedNumber Component
 * Animates a numeric value from start/0 to target value with easing.
 * 
 * Props:
 * - value: number | string (e.g. 1250, "1250", 45 text)
 * - duration: duration of animation in ms (default 1200ms)
 * - decimals: number of decimal places (default 0)
 * - prefix: string prefix (e.g. "₹")
 * - suffix: string suffix (e.g. " L", "%")
 * - className: custom styling classes
 */
export const AnimatedNumber = ({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  // Extract number from string if needed
  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const targetValue = parseNum(value);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Cubic easeOut formula for silky smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  const formattedNum = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <span className={className}>
      {prefix}{formattedNum}{suffix}
    </span>
  );
};

/**
 * Skeleton Loader Components for Shimmer loading states
 */

export const SkeletonCard = ({ className = "h-32 w-full" }) => (
  <div className={`rounded-2xl skeleton-pulse overflow-hidden ${className}`} />
);

export const SkeletonText = ({ className = "h-4 w-3/4" }) => (
  <div className={`rounded-md skeleton-pulse ${className}`} />
);

export const SkeletonCircle = ({ className = "w-12 h-12" }) => (
  <div className={`rounded-full skeleton-pulse ${className}`} />
);

/**
 * Animated Empty State SVG Component
 * Renders an interactive, floating animated SVG state when data lists are empty.
 */
export const EmptyState = ({
  title = "No Data Found",
  subtitle = "There are currently no items to display.",
  svgSrc = "/empty_state_meter_reading.svg",
  actionButton = null,
  className = ""
}) => {
  return (
    <div className={`py-12 px-6 text-center text-text-muted flex flex-col items-center justify-center min-h-[320px] ${className}`}>
      <div className="relative group mb-4">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors animate-pulse" />
        <img
          src={svgSrc}
          alt={title}
          className="w-44 h-44 object-contain relative z-10 animate-bounce-subtle drop-shadow-xl transition-transform duration-500 hover:scale-105"
          style={{ animationDuration: '4s' }}
        />
      </div>
      <h3 className="font-extrabold text-lg text-text tracking-tight">{title}</h3>
      <p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed">{subtitle}</p>
      {actionButton && <div className="mt-5">{actionButton}</div>}
    </div>
  );
};

export default AnimatedNumber;
