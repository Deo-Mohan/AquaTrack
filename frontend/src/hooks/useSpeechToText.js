import { useState, useRef, useCallback } from 'react';

/**
 * useSpeechToText
 * Wraps the Web Speech API (SpeechRecognition) for easy use in search boxes.
 *
 * @param {(transcript: string) => void} onResult  — called with the final transcript
 * @param {object} options
 * @param {string} options.lang                    — BCP-47 language tag, default 'en-IN'
 * @param {boolean} options.continuous             — keep listening after first result, default false
 */
export default function useSpeechToText(onResult, { lang = 'en-IN', continuous = false } = {}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!supported || listening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, listening, lang, continuous, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    listening ? stop() : start();
  }, [listening, start, stop]);

  return { listening, supported, toggle, start, stop };
}
