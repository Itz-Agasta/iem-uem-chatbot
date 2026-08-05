import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechOutput {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

// Some browsers (long-standing Firefox bug, present in Firefox-based
// browsers like Zen) will silently cut off or never start an utterance if
// the SpeechSynthesisUtterance object gets garbage-collected before it
// finishes. Keeping a live reference to it for the duration of playback
// prevents that. (Read via getKeepAlive() so bundlers/TS don't flag it as
// an unused module-level variable -- it genuinely matters for GC retention.)
let utteranceKeepAlive: SpeechSynthesisUtterance | null = null;
function getKeepAlive() {
  return utteranceKeepAlive;
}

/**
 * Reads text aloud using the browser's built-in SpeechSynthesis API.
 * No audio ever leaves the device -- this is entirely local TTS.
 *
 * speechSynthesis is a standard Web API supported in Chrome, Firefox
 * (and Firefox-based browsers such as Zen), Safari, and Edge -- this hook
 * works the same way across all of them, it isn't Chrome-specific.
 */
export function useSpeechSynthesis(): UseSpeechOutput {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);

  const pickVoice = useCallback(() => {
    if (!isSupported) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    voicesLoadedRef.current = true;
    voiceRef.current =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    // If speak() was called before the voice list finished loading
    // (common on first page load in Firefox/Zen), play the queued text now.
    if (pendingTextRef.current) {
      const text = pendingTextRef.current;
      pendingTextRef.current = null;
      speakNow(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;
    // Some browsers (Chrome) load voices asynchronously and fire
    // onvoiceschanged; others (older Firefox) have them ready immediately.
    // Covering both means it works everywhere.
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, pickVoice]);

  const speakNow = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      window.speechSynthesis.cancel(); // don't overlap with a previous utterance

      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceKeepAlive = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceKeepAlive = null;
      };

      // Prevent the GC-related silent-cutoff bug described above.
      utteranceKeepAlive = utterance;

      window.speechSynthesis.speak(utterance);

      // Firefox/Zen sometimes needs a nudge if speech synthesis was paused
      // by the browser (e.g. after being idle) -- resume() is a harmless
      // no-op if it wasn't paused.
      window.speechSynthesis.resume();
    },
    [isSupported]
  );

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      if (!voicesLoadedRef.current && window.speechSynthesis.getVoices().length === 0) {
        // Voice list not ready yet (first call right after page load in some
        // browsers) -- queue it, pickVoice() will flush this once ready.
        pendingTextRef.current = text;
        return;
      }
      speakNow(text);
    },
    [isSupported, speakNow]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    pendingTextRef.current = null;
    window.speechSynthesis.cancel();
    if (getKeepAlive()) utteranceKeepAlive = null;
    setIsSpeaking(false);
  }, [isSupported]);

  // Stop speaking if the component unmounts mid-utterance
  useEffect(() => () => stop(), [stop]);

  return { isSpeaking, isSupported, speak, stop };
}
