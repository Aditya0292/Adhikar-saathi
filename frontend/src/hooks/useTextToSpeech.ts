import { useState, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useTextToSpeech() {
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nativeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop any active playback
  const stop = () => {
    // Stop ElevenLabs audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    // Stop Native Speech Synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    nativeUtteranceRef.current = null;
    setSpeakingMsgId(null);
    setIsSpeechLoading(false);
  };

  const speak = async (msgId: string, text: string, lang: string) => {
    // If clicking the currently speaking message, stop it
    if (speakingMsgId === msgId) {
      stop();
      return;
    }

    // Stop anything currently playing
    stop();
    setSpeakingMsgId(msgId);
    setIsSpeechLoading(true);

    try {
      // 1. Try calling the backend ElevenLabs/Sarvam TTS API
      const response = await fetch(`${API_BASE_URL}/api/v1/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language: lang }),
      });

      if (response.status === 412) {
        // Precondition Failed: NO_TTS_KEY
        console.warn('TTS API key missing in backend. Falling back to browser-native TTS.');
        speakBrowserNative(text, lang);
        return;
      }

      if (!response.ok) {
        throw new Error(`TTS server responded with status: ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        setIsSpeechLoading(false);
      };

      audio.onended = () => {
        setSpeakingMsgId(null);
        setIsSpeechLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error, falling back to browser-native TTS:', e);
        speakBrowserNative(text, lang);
      };

      audioRef.current = audio;
      await audio.play();

    } catch (error) {
      console.error('Failed to speak via backend. Falling back to browser-native TTS:', error);
      speakBrowserNative(text, lang);
    }
  };

  const speakBrowserNative = (text: string, lang: string) => {
    setIsSpeechLoading(false);
    if (!window.speechSynthesis) {
      console.error('Browser does not support Speech Synthesis');
      setSpeakingMsgId(null);
      return;
    }

    // Force cancel and resume to unstick Chrome's speech synthesis engine
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.error('Error canceling speech synthesis:', e);
    }

    // Clean text (remove markdown elements, stars, hash tags to make it read naturally)
    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\[\d+\]/g, '') // remove citation brackets like [1]
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Map code to locales
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN'
    };

    utterance.lang = langMap[lang.toLowerCase().split('-')[0]] || 'en-US';

    // Attempt to select a high-quality regional voice if available
    if (window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(utterance.lang.substring(0, 2)));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => {
      setSpeakingMsgId(null);
      nativeUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesisUtterance error:', e);
      setSpeakingMsgId(null);
      nativeUtteranceRef.current = null;
    };

    nativeUtteranceRef.current = utterance;
    
    // Tiny timeout to let browser finish cancellation state register
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    speakingMsgId,
    isSpeechLoading,
    speak,
    stop
  };
}
