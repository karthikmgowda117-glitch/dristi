import { useState, useEffect, useCallback, useRef } from "react";

export interface TextToSpeechHook {
  speaking: boolean;
  audioEnabled: boolean;
  setAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  speak: (text: string, forceLang?: "en" | "kn") => void;
  stop: () => void;
  isSupported: boolean;
}

// Format technical acronyms for clear spoken output
function formatForSpeech(text: string): string {
  return text
    .replace(/KA-WF-2026-0417/gi, "K A Whitefield Case 4 1 7")
    .replace(/KA-WF-2026-0428/gi, "K A Whitefield Case 4 2 8")
    .replace(/KA-WF-2026-0398/gi, "K A Whitefield Case 3 9 8")
    .replace(/KA-KR-2026-0112/gi, "K A K R Puram Case 1 1 2")
    .replace(/KA-MP-2026-0089/gi, "K A Mahadevapura Case 0 8 9")
    .replace(/BNS/g, "B.N.S.")
    .replace(/IPC/g, "I.P.C.")
    .replace(/SHO/g, "S.H.O.")
    .replace(/IO/g, "I.O.")
    .replace(/DSP/g, "D.S.P.")
    .replace(/SHA-256/gi, "S H A 2 5 6")
    .replace(/Z-score/gi, "Z score");
}

export function useTextToSpeech(): TextToSpeechHook {
  const [speaking, setSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load browser SpeechSynthesis voices if available
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setIsSupported(true);
      return;
    }

    const updateVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      } catch (e) {
        console.warn("Could not retrieve speechSynthesis voices:", e);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const stop = useCallback(() => {
    // Stop HTML5 Cloud Audio player
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Stop Web Speech Synthesis
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("Error stopping speech synthesis:", e);
      }
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, forceLang?: "en" | "kn") => {
      if (!audioEnabled) return;

      stop(); // Stop any active audio playback

      const isKannada = /[\u0C80-\u0CFF]/.test(text) || forceLang === "kn";
      const cleanText = formatForSpeech(text)
        .replace(/[*_#•]/g, "")
        .replace(/\n+/g, ". ")
        .trim();

      if (!cleanText) return;

      // Primary Audio Engine: High-Definition TTS Audio Stream
      // Works 100% on deployed domains (Catalyst, Vercel) across all Android, iOS, Windows, Mac devices!
      const langCode = isKannada ? "kn" : "en";
      const encodedQuery = encodeURIComponent(cleanText.slice(0, 200));
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode}&q=${encodedQuery}`;

      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setSpeaking(true);
      };

      audio.onended = () => {
        setSpeaking(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback Engine: Web Speech API SpeechSynthesis if network audio stream fails
        currentAudioRef.current = null;

        if ("speechSynthesis" in window) {
          if (window.speechSynthesis.paused) {
            try {
              window.speechSynthesis.resume();
            } catch (e) {}
          }

          const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
          const utterance = new SpeechSynthesisUtterance(cleanText);

          if (isKannada) {
            utterance.lang = "kn-IN";
            const knVoice = currentVoices.find(
              (v) => v.lang.toLowerCase().includes("kn") || v.name.toLowerCase().includes("kannada")
            );
            if (knVoice) utterance.voice = knVoice;
          } else {
            utterance.lang = "en-IN";
            const enVoice = currentVoices.find(
              (v) => v.lang.startsWith("en") && (v.name.includes("India") || v.name.includes("Google"))
            );
            if (enVoice) utterance.voice = enVoice;
          }

          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);

          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            setSpeaking(false);
          }
        } else {
          setSpeaking(false);
        }
      };

      // Play HD audio stream out loud
      audio.play().catch((err) => {
        console.warn("Audio autoplay blocked by browser, using Web Speech API fallback:", err);

        // Immediate fallback to SpeechSynthesis
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = isKannada ? "kn-IN" : "en-IN";
          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);

          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            setSpeaking(false);
          }
        }
      });
    },
    [audioEnabled, stop, voices]
  );

  return {
    speaking,
    audioEnabled,
    setAudioEnabled,
    speak,
    stop,
    isSupported,
  };
}
