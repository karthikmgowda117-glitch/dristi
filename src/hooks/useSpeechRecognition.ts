import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechRecognitionHook {
  listening: boolean;
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  isSupported: boolean;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  toggleListening: (lang?: string) => void;
  simulateSpeech: (mockText?: string) => void;
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const startListening = useCallback((lang = "en-IN") => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setError(null);

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Web Speech API is not supported in this browser. You can type your query below or use simulated speech.");
      simulateSpeech();
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let current = "";
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setListening(false);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access was denied. Please allow microphone permission in your browser URL bar.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Please check your mic and try speaking again.");
        } else if (event.error !== "aborted") {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setError("Could not launch microphone. Using speech simulation.");
      simulateSpeech();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setListening(false);
    }
  }, []);

  const toggleListening = useCallback(
    (lang = "en-IN") => {
      if (listening) {
        stopListening();
      } else {
        startListening(lang);
      }
    },
    [listening, startListening, stopListening]
  );

  const simulateSpeech = useCallback((mockText?: string) => {
    setListening(true);
    setError(null);
    setTimeout(() => {
      setListening(false);
      setTranscript(mockText || "show co-accused links for FIR 2026 slash zero four one seven");
    }, 1500);
  }, []);

  return {
    listening,
    transcript,
    setTranscript,
    error,
    setError,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    simulateSpeech,
  };
}
