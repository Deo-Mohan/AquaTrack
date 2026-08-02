import React, { useCallback } from 'react';
import { Search, X, Mic, MicOff } from 'lucide-react';
import useSpeechToText from '../hooks/useSpeechToText';

/**
 * MicSearchBox
 * Drop-in replacement for any search <input> that adds a speech-to-text mic button.
 *
 * Props:
 *  value       – controlled input value
 *  onChange    – called with new string value
 *  onClear     – called when ✕ is clicked (optional)
 *  onFocus     – forwarded to the <input>
 *  onKeyDown   – forwarded to the <input> (for arrow key / Tab navigation)
 *  placeholder – input placeholder text
 *  className   – extra classes on the wrapper div
 *  inputClass  – extra classes on the <input>
 *  active      – whether to show active (focused) ring styles
 */
export default function MicSearchBox({
  value,
  onChange,
  onClear,
  onFocus,
  onKeyDown,
  placeholder = 'Search...',
  className = '',
  inputClass = '',
  active = false,
}) {
  const handleResult = useCallback(
    (transcript) => onChange(transcript),
    [onChange]
  );

  const { listening, supported, toggle } = useSpeechToText(handleResult);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-surface-lighter/60 border border-border/80 rounded-2xl transition-all hover:border-primary/40 ${
        active || listening
          ? 'border-primary/50 shadow-lg shadow-primary/10'
          : 'border-border'
      } ${className}`}
    >
      {/* Search icon */}
      <Search className="w-4.5 h-4.5 text-primary flex-shrink-0" />

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={listening ? '🎤 Listening...' : placeholder}
        className={`flex-1 bg-transparent text-text placeholder-text-muted text-sm focus:outline-none ${inputClass}`}
      />

      {/* Clear button */}
      {value && !listening && (
        <button
          onClick={onClear}
          className="text-text-muted hover:text-text cursor-pointer flex-shrink-0 transition-colors"
          title="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Mic button */}
      {supported && (
        <button
          onClick={toggle}
          title={listening ? 'Stop listening' : 'Search by voice'}
          className={`flex-shrink-0 cursor-pointer transition-all rounded-full p-1 ${
            listening
              ? 'text-red-400 bg-red-500/15 animate-pulse'
              : 'text-text-muted hover:text-primary hover:bg-primary/10'
          }`}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
