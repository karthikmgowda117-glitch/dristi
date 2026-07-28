import { useState, useEffect, useCallback, useRef } from "react";

export interface TextToSpeechHook {
  speaking: boolean;
  audioEnabled: boolean;
  setAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  speak: (text: string, forceLang?: "en" | "kn") => void;
  stop: () => void;
  isSupported: boolean;
}

// Convert acronyms & code IDs to smooth spoken words for natural TTS pronunciation
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

// Complete Kannada to phonetic transliteration for seamless speech on devices lacking native kn-IN voice pack
function transliterateKannada(text: string): string {
  if (!/[\u0C80-\u0CFF]/.test(text)) return text;

  return text
    .replace(/ದೃಷ್ಟಿ ಎಐ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧವಾಗಿದೆ/g, "Drishti A I vyavashthe siddhavagide")
    .replace(/ನಮಸ್ಕಾರ ಅಧಿಕಾರಿಯವರೇ/g, "Namaskara adhikariyavare")
    .replace(/ಇಂದಿನ ತನಿಖೆಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ/g, "indina tanikhege naanu hege sahaaya maadali")
    .replace(/ಗ್ರಾಫ್ ವಿಶ್ಲೇಷಣೆ ಫಲಿತಾಂಶ/g, "Graph vishleshane phalithaamsha")
    .replace(/ಆರೋಪಿ/g, "aaropi")
    .replace(/ಪ್ರಕರಣ/g, "prakarana")
    .replace(/ವಿಶ್ವಾಸಾರ್ಹತೆ/g, "vishvasaarhate")
    .replace(/ಶೇಕಡಾ/g, "shekada")
    .replace(/ಕಾನೂನು ವಿಶ್ಲೇಷಣೆ/g, "kaanoonu vishleshane")
    .replace(/ಚೈನ್ ಸ್ನಾಚಿಂಗ್/g, "chain snatching")
    .replace(/ದೂರುದಾರರು/g, "daorudaararu")
    .replace(/ಪರಿಪೂರ್ಣತೆ/g, "paripoornaate")
    .replace(/ಸುರಕ್ಷಿತ/g, "surakshitha")
    .replace(/ಕ್ಯೂ\.ಆರ್ ಕೋಡ್/g, "QR code")
    .replace(/ರಚಿಸಲಾಗಿದೆ/g, "rachisalaagide")
    .replace(/ಅಪರಾಧ/g, "aparaadha")
    .replace(/ವಿಶ್ಲೇಷಣೆ/g, "vishleshane")
    .replace(/ಪೂರ್ಣಗೊಂಡಿದೆ/g, "poornagondide")
    .replace(/ದಾಖಲಾಗಿದೆ/g, "daakhalaagide")
    .replace(/ಯಶಸ್ವಿಯಾಗಿ/g, "yashasviyaagi")
    .replace(/ಪರಿಶೀಲನೆಗೆ/g, "parisheelanege")
    .replace(/ಕಳುಹಿಸಲಾಗಿದೆ/g, "kaluhisalaagide")
    .replace(/ತಡೆಯಲಾಗಿದೆ/g, "thadeyalaagide")
    .replace(/ಅಧಿಕಾರವಿರುವುದಿಲ್ಲ/g, "adhikaaraviruvudilla")
    .replace(/ವೈಟ್‌ಫೀಲ್ಡ್/g, "Whitefield")
    .replace(/ಠಾಣೆ/g, "thaane")
    .replace(/ಇನ್‌ಸ್ಪೆಕ್ಟರ್/g, "Inspector")
    .replace(/ವರದಿಯನ್ನು/g, "varadiyannu")
    .replace(/ಸೂಚನೆ/g, "soochane")
    .replace(/ಸಂಪೂರ್ಣ/g, "sampoorna")
    .replace(/ವಿವರಗಳನ್ನು/g, "vivaragalannu");
}

export function useTextToSpeech(): TextToSpeechHook {
  const [speaking, setSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices asynchronously & handle onvoiceschanged across all browsers
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
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
      if (!audioEnabled || !("speechSynthesis" in window)) return;

      stop(); // Stop any previous speech

      // Ensure browser speechSynthesis is unpaused
      if (window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {
          console.warn("Speech synthesis resume failed:", e);
        }
      }

      const hasKannadaScript = /[\u0C80-\u0CFF]/.test(text) || forceLang === "kn";

      // Get current voices list
      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();

      // Find native Kannada voice (kn-IN)
      const exactKnVoice = currentVoices.find(
        (v) =>
          v.lang.toLowerCase().includes("kn") ||
          v.name.toLowerCase().includes("kannada") ||
          v.lang.toLowerCase().startsWith("kn")
      );

      // Find Indian accent voice (hi-IN, ta-IN, te-IN, en-IN) as secondary fallback
      const indianVoice = currentVoices.find(
        (v) => v.lang.includes("IN") || v.name.includes("India")
      );

      // Preferred English Voice fallback
      const defaultEnVoice = currentVoices.find((v) => v.lang.startsWith("en"));

      let speechText = formatForSpeech(text);
      let targetLang = "en-IN";
      let chosenVoice: SpeechSynthesisVoice | undefined = undefined;

      if (hasKannadaScript) {
        if (exactKnVoice) {
          // Device has native Kannada voice installed
          targetLang = "kn-IN";
          chosenVoice = exactKnVoice;
          speechText = text;
        } else if (indianVoice) {
          // Device lacks native Kannada voice — use Indian accent voice + transliterated text for clear audio!
          targetLang = indianVoice.lang || "en-IN";
          chosenVoice = indianVoice;
          speechText = transliterateKannada(text);
        } else {
          // Fallback to default speech voice
          targetLang = "en-IN";
          chosenVoice = defaultEnVoice;
          speechText = transliterateKannada(text);
        }
      } else {
        targetLang = "en-IN";
        chosenVoice =
          currentVoices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Google") ||
                v.name.includes("Natural") ||
                v.name.includes("India") ||
                v.name.includes("Guy") ||
                v.name.includes("Male"))
          ) || defaultEnVoice;
      }

      // Clean up markup symbols from text before passing to utterance
      const cleanText = speechText
        .replace(/[*_#•]/g, "")
        .replace(/\n+/g, ". ")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      utterance.lang = targetLang;
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.rate = 0.92; // Natural, clear speaking speed
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.warn("Speech synthesis notice:", event);
        setSpeaking(false);
      };

      // Speak text out loud
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Speech synthesis invocation failed:", err);
        setSpeaking(false);
      }
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
