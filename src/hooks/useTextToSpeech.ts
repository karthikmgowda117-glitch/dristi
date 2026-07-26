import { useState, useEffect, useCallback, useRef } from "react";

export interface TextToSpeechHook {
  speaking: boolean;
  audioEnabled: boolean;
  setAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  speak: (text: string, forceLang?: "en" | "kn") => void;
  stop: () => void;
  isSupported: boolean;
}

export function useTextToSpeech(): TextToSpeechHook {
  const [speaking, setSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
    }
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, forceLang?: "en" | "kn") => {
      if (!audioEnabled || !("speechSynthesis" in window)) return;

      stop(); // Stop any previous speech

      // Clean up markup/formatting symbols from text before reading
      const cleanText = text
        .replace(/[*_#•]/g, "")
        .replace(/\n+/g, ". ")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      // Check if text contains Kannada Unicode characters [\u0C80-\u0CFF]
      const hasKannada = /[\u0C80-\u0CFF]/.test(cleanText) || forceLang === "kn";

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();

      if (hasKannada) {
        utterance.lang = "kn-IN";
        const knVoice =
          voices.find((v) => v.lang.startsWith("kn") || v.lang.includes("kn")) ||
          voices.find((v) => v.lang.includes("IN"));
        if (knVoice) {
          utterance.voice = knVoice;
        }
      } else {
        utterance.lang = "en-IN";
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Google") ||
                v.name.includes("Natural") ||
                v.name.includes("Guy") ||
                v.name.includes("David") ||
                v.name.includes("Male"))
          ) || voices.find((v) => v.lang.startsWith("en"));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.warn("Speech synthesis error:", event);
        setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [audioEnabled, stop]
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
