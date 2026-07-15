import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

/**
 * useUsernameCheck — Smart username availability hook
 *
 * Features:
 *  - Debounced API call (400ms) — saves database round trips
 *  - In-memory LRU-style cache — same username never double-checked
 *  - Instant local validation (< 3 chars) — no API needed
 *  - Normalizes input (trim + lowercase) before lookup
 *  - Returns: { status: 'idle'|'typing'|'checking'|'available'|'taken'|'error', message }
 */

// Module-level cache shared across all instances — persists through re-renders
const usernameCache = new Map(); // username → true (exists) | false (free)
const MAX_CACHE_SIZE = 200;

function addToCache(username, exists) {
  if (usernameCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = usernameCache.keys().next().value;
    usernameCache.delete(firstKey);
  }
  usernameCache.set(username, exists);
}

export default function useUsernameCheck(username) {
  const [status, setStatus] = useState('idle');   // idle | typing | checking | available | taken | error
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const check = useCallback(async (raw) => {
    const value = (raw || '').trim().toLowerCase();

    // Clear any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();

    // --- Instant local validation ---
    if (!value) {
      setStatus('idle'); setMessage(''); return;
    }
    if (value.length < 3) {
      setStatus('typing');
      setMessage('At least 3 characters required');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(value)) {
      setStatus('typing');
      setMessage('Only letters, numbers, _ . - allowed');
      return;
    }

    // --- Cache hit? Skip API call completely ---
    if (usernameCache.has(value)) {
      const exists = usernameCache.get(value);
      setStatus(exists ? 'taken' : 'available');
      setMessage(exists ? 'Username already taken' : 'Username is available ✓');
      return;
    }

    // --- Debounce before hitting the API ---
    setStatus('typing');
    setMessage('');
    timerRef.current = setTimeout(async () => {
      setStatus('checking');
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await api.get(`/auth/check-username`, {
          params: { username: value },
          signal: controller.signal,
        });
        const exists = res.data?.exists || false;
        addToCache(value, exists);
        setStatus(exists ? 'taken' : 'available');
        setMessage(exists ? 'Username already taken' : 'Username is available ✓');
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setStatus('error');
        setMessage('Could not verify — try again');
      }
    }, 400);
  }, []);

  useEffect(() => {
    check(username);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [username, check]);

  return { status, message };
}

/** Reusable inline status badge rendered below/beside the input */
export function UsernameStatusBadge({ status, message }) {
  if (status === 'idle') return null;

  const config = {
    typing:    { color: 'text-text-muted', dot: 'bg-text-muted/40', animate: false },
    checking:  { color: 'text-primary',    dot: 'bg-primary',       animate: true  },
    available: { color: 'text-emerald-400',dot: 'bg-emerald-400',   animate: false },
    taken:     { color: 'text-red-400',    dot: 'bg-red-400',       animate: false },
    error:     { color: 'text-amber-400',  dot: 'bg-amber-400',     animate: false },
  }[status] || {};

  return (
    <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''} flex-shrink-0`} />
      {message}
    </div>
  );
}

/** Returns border class for the input based on status */
export function getUsernameBorderClass(status) {
  switch (status) {
    case 'available': return 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30';
    case 'taken':     return 'border-red-500 focus:border-red-500 focus:ring-red-500/30';
    case 'checking':  return 'border-primary focus:border-primary focus:ring-primary/30';
    case 'error':     return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500/30';
    default:          return 'border-border focus:border-primary/50 focus:ring-primary/20';
  }
}

/** Returns icon character for the right side of the input */
export function getUsernameIcon(status) {
  switch (status) {
    case 'available': return '✓';
    case 'taken':     return '✗';
    case 'checking':  return '…';
    case 'error':     return '!';
    default:          return null;
  }
}
