import { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Volume2, VolumeX, Loader2, Play, 
  ThumbsUp, ThumbsDown, Shield, Phone, Star, MapPin 
} from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

interface VoiceAdviserProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

interface Turn {
  role: 'user' | 'adviser';
  text: string;
  law?: string;
  audioUrl?: string;
  helpful?: boolean;
}

interface Lawyer {
  id: string;
  full_name: string;
  specialisations: string[];
  city: string;
  state: string;
  experience_years: number;
  fee_per_hour_inr: number;
  offers_free_consultation: boolean;
  rating: number;
  languages: string[];
}

export function VoiceAdviser({ isOpen, onClose, lang }: VoiceAdviserProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [appState, setAppState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [visibleSpeechText, setVisibleSpeechText] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [suggestedLawyers, setSuggestedLawyers] = useState<Lawyer[]>([]);
  const [showLawyerPanel, setShowLawyerPanel] = useState(false);
  const [currentLawBadge, setCurrentLawBadge] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechIntervalRef = useRef<any>(null);
  const sessionTimerRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const BASE_URL = 'http://localhost:8000';

  const handleRecordingComplete = async (blob: Blob, hasSpoken: boolean) => {
    if (!sessionId) return;
    
    if (!hasSpoken) {
      console.log("No speech detected during recording. Resetting to idle.");
      setAppState('idle');
      return;
    }

    setAppState('processing');
    lastActivityRef.current = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', blob);

      const res = await fetch(`${BASE_URL}/api/v1/voice/session/${sessionId}/turn`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to process voice turn');
      }

      const data = await res.json();
      
      // Append user turn
      const userTurn: Turn = { role: 'user', text: data.transcript };
      
      // Append adviser turn
      const adviserTurn: Turn = { 
        role: 'adviser', 
        text: data.response_text,
        law: data.scenario_type ? `Category: ${data.scenario_type.replace('_', ' ')}` : undefined,
        audioUrl: data.audio_url ? `${BASE_URL}${data.audio_url}` : undefined
      };

      setTurns(prev => [...prev, userTurn, adviserTurn]);
      setCurrentSpeechText(data.response_text);
      setCurrentLawBadge(data.scenario_type || null);
      
      if (data.audio_url) {
        playResponseAudio(`${BASE_URL}${data.audio_url}`, data.response_text);
      } else {
        playResponseAudio('', data.response_text);
      }

    } catch (err) {
      console.error(err);
      setAppState('idle');
    }
  };

  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    amplitude, 
    silenceWarning, 
    maxDurationReached 
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  // 1. Initialize Voice Session
  useEffect(() => {
    if (isOpen) {
      lastActivityRef.current = Date.now();
      startSession();
      // Start session duration timer
      setTimerSeconds(0);
      sessionTimerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          // Check for 15-minute inactivity (900 seconds)
          if (Date.now() - lastActivityRef.current > 900000) {
            handleInactivityTimeout();
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      cleanupSession();
    }

    return () => {
      cleanupSession();
    };
  }, [isOpen]);

  // Auto scroll to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, visibleSpeechText, appState]);

  const startSession = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/voice/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
      if (!res.ok) throw new Error('Start failed');
      const data = await res.json();
      setSessionId(data.session_id);
      
      // Play Greeting audio
      const greetingText = lang === 'hi' 
        ? "नमस्ते, मैं न्याय हूँ। आज आपकी क्या सहायता कर सकता हूँ?" 
        : "Hello, I'm Nyaya, your legal adviser. What can I help you with today?";
      
      const greetingTurn: Turn = { role: 'adviser', text: greetingText };
      setTurns([greetingTurn]);
      
      if (data.greeting_audio_url) {
        playResponseAudio(`${BASE_URL}${data.greeting_audio_url}`, greetingText);
      } else {
        playResponseAudio('', greetingText);
      }
    } catch (e) {
      console.error(e);
      setAppState('idle');
    }
  };

  const playResponseAudio = (url: string, text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setAppState('speaking');
    setVisibleSpeechText('');
    
    // If no remote audio URL is provided, fall back to browser native SpeechSynthesis
    if (!url) {
      playNativeSpeech(text);
      return;
    }
    
    const audio = new Audio(url);
    audioRef.current = audio;
    
    // Simulate word-by-word display timed with speech
    const words = text.split(' ');
    let currentWordIndex = 0;
    
    audio.onplay = () => {
      const duration = audio.duration || 5; // fallback
      const intervalMs = (duration * 1000) / words.length;
      
      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = setInterval(() => {
        if (currentWordIndex < words.length) {
          setVisibleSpeechText(prev => prev + (prev ? ' ' : '') + words[currentWordIndex]);
          currentWordIndex++;
        } else {
          clearInterval(speechIntervalRef.current);
        }
      }, Math.max(intervalMs, 100)); // limit speed reasonably
    };

    audio.onended = () => {
      clearInterval(speechIntervalRef.current);
      setVisibleSpeechText(text);
      setAppState('idle');
    };

    audio.onerror = () => {
      console.warn('Audio failed to play, falling back to browser SpeechSynthesis');
      playNativeSpeech(text);
    };

    audio.play().catch(e => {
      console.warn('Audio play auto-blocked, falling back to browser SpeechSynthesis:', e);
      playNativeSpeech(text);
    });
  };

  const playNativeSpeech = (text: string) => {
    if (!window.speechSynthesis) {
      simulateSpeaking(text);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const langPrefix = lang ? lang.toLowerCase().split('-')[0] : 'en';
    if (langPrefix === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (langPrefix === 'ta') {
      utterance.lang = 'ta-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    const words = text.split(' ');
    let currentWordIndex = 0;

    utterance.onstart = () => {
      const durationEstimate = (words.length * 60) / 150; // estimate 150 WPM
      const intervalMs = (durationEstimate * 1000) / words.length;

      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = setInterval(() => {
        if (currentWordIndex < words.length) {
          setVisibleSpeechText(prev => prev + (prev ? ' ' : '') + words[currentWordIndex]);
          currentWordIndex++;
        } else {
          clearInterval(speechIntervalRef.current);
        }
      }, Math.max(intervalMs, 120));
    };

    utterance.onend = () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
      setVisibleSpeechText(text);
      setAppState('idle');
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      simulateSpeaking(text);
    };

    window.speechSynthesis.speak(utterance);
  };

  const simulateSpeaking = (text: string) => {
    setAppState('speaking');
    setVisibleSpeechText('');
    
    const words = text.split(' ');
    let currentWordIndex = 0;
    
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    speechIntervalRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        setVisibleSpeechText(prev => prev + (prev ? ' ' : '') + words[currentWordIndex]);
        currentWordIndex++;
      } else {
        clearInterval(speechIntervalRef.current);
        setAppState('idle');
      }
    }, 200); // 200ms per word
  };

  const mutePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
    }
    setVisibleSpeechText(currentSpeechText);
    setAppState('idle');
  };

  const handleInactivityTimeout = () => {
    alert("Our conversation has been saved. You can continue anytime.");
    onClose();
  };

  const replayAudio = (turn: Turn) => {
    if (turn.audioUrl) {
      playResponseAudio(turn.audioUrl, turn.text);
    } else {
      simulateSpeaking(turn.text);
    }
  };

  const handleFeedback = (index: number, isHelpful: boolean) => {
    setTurns(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], helpful: isHelpful };
      return updated;
    });
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const endSessionApi = async () => {
    if (!sessionId) {
      onClose();
      return;
    }
    
    try {
      const res = await fetch(`${BASE_URL}/api/v1/voice/session/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggested_lawyers && data.suggested_lawyers.length > 0) {
          setSuggestedLawyers(data.suggested_lawyers);
          setShowLawyerPanel(true);
          return; // Don't close immediately if showing lawyers
        }
      }
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  const cleanupSession = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1510] text-[#E0E2E0] flex flex-col font-sans">
      
      {/* Header */}
      <header className="border-b border-[#1B291E] px-6 py-4 flex items-center justify-between bg-[#0A0E0B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-nyaya-green/20 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Nyaya Logo" className="h-5 w-auto object-contain" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base text-white">Voice Adviser — Nyaya</h2>
            <span className="text-[10px] text-nyaya-green font-semibold">Active Session</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#152219] px-3 py-1 rounded-full text-xs font-semibold border border-[#233527] text-nyaya-green">
            {formatTimer(timerSeconds)}
          </div>
          <button 
            onClick={endSessionApi}
            className="p-2 bg-[#1B291E] hover:bg-red-950/40 text-nyaya-muted hover:text-red-400 rounded-full transition-colors cursor-pointer"
            title="End Session"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Area: Scrollable History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-gradient-to-b from-[#0E1510] to-[#0A0E0B]"
      >
        {turns.map((turn, index) => (
          <div key={index} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 font-sans text-sm leading-relaxed ${
              turn.role === 'user' 
                ? 'bg-[#183626] text-white rounded-tr-none' 
                : 'bg-white text-slate-800 shadow-xl rounded-tl-none border border-slate-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  turn.role === 'user' ? 'text-nyaya-green' : 'text-slate-400'
                }`}>
                  {turn.role === 'user' ? 'You' : 'Nyaya'}
                </span>
                {turn.role === 'adviser' && turn.law && (
                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded capitalize">
                    {turn.law.replace('Category:', '')}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line text-xs md:text-sm">{turn.text}</p>
              
              {turn.role === 'adviser' && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleFeedback(index, true)}
                      className={`p-1.5 rounded transition-colors ${turn.helpful === true ? 'text-nyaya-green bg-nyaya-green/10' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button 
                      onClick={() => handleFeedback(index, false)}
                      className={`p-1.5 rounded transition-colors ${turn.helpful === false ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => replayAudio(turn)}
                    className="flex items-center gap-1 text-[10px] font-bold text-nyaya-green hover:underline cursor-pointer"
                  >
                    <Play size={10} /> Replay
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current Speaking Display */}
        {appState === 'speaking' && visibleSpeechText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white text-slate-800 rounded-2xl rounded-tl-none p-4 shadow-xl border border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-nyaya-green uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-nyaya-green rounded-full animate-ping"></span>
                  Speaking
                </span>
                {currentLawBadge && (
                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded capitalize">
                    {currentLawBadge.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line text-xs md:text-sm font-medium">{visibleSpeechText}</p>
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {appState === 'processing' && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 bg-[#111A13] border border-[#1D2E21] px-5 py-3 rounded-2xl rounded-tl-none text-xs text-nyaya-green font-semibold">
              <Loader2 className="animate-spin" size={16} />
              <span>
                {lang === 'hi' ? 'न्याय सोच रहा है...' : 'Nyaya is thinking...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Interactive Voice State Controls */}
      <footer className="border-t border-[#1B291E] p-8 flex flex-col items-center justify-center bg-[#0A0E0B] gap-4">
        
        {/* VAD Warnings / Informational Hints */}
        {silenceWarning && isRecording && (
          <div className="text-xs text-amber-400 font-medium px-4 py-1.5 bg-amber-950/20 border border-amber-900/40 rounded-full animate-pulse">
            {silenceWarning}
          </div>
        )}
        {maxDurationReached && (
          <div className="text-xs text-red-400 font-medium px-4 py-1.5 bg-red-950/20 border border-red-900/40 rounded-full">
            I'll need a moment to process that. (60s limit reached)
          </div>
        )}

        <div className="flex items-center justify-center gap-8 w-full max-w-md">
          
          {/* Mute Button (Only active when speaking) */}
          <button 
            disabled={appState !== 'speaking'}
            onClick={mutePlayback}
            className={`p-3 rounded-full border transition-all ${
              appState === 'speaking'
                ? 'bg-amber-950/20 border-amber-900 text-amber-500 hover:bg-amber-950/40 cursor-pointer'
                : 'bg-[#152219]/20 border-transparent text-[#2D3E31] cursor-not-allowed'
            }`}
            title="Mute Playback"
          >
            {appState === 'speaking' ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Large Center Mic Button */}
          {appState === 'processing' ? (
            <div className="w-20 h-20 rounded-full bg-[#183626] border border-[#234F37] flex items-center justify-center shadow-lg shadow-nyaya-green/10">
              <Loader2 className="animate-spin text-nyaya-green" size={32} />
            </div>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all relative ${
                isRecording 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/10'
                  : 'bg-nyaya-green text-nyaya-dark hover:bg-nyaya-green-mid'
              }`}
              title={isRecording ? 'Tap to finish' : 'Tap to speak'}
            >
              {/* Outer pulsing ring for idle */}
              {!isRecording && appState === 'idle' && (
                <span className="absolute inset-0 rounded-full border-4 border-nyaya-green/30 animate-ping" style={{ animationDuration: '3s' }}></span>
              )}
              {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
          )}

          {/* Dummy visual space to center mic */}
          <div className="w-11 h-11"></div>
        </div>

        {/* Interactive Guidance Labels */}
        <div className="text-center">
          <p className="text-sm font-semibold text-white tracking-wide">
            {appState === 'listening' || isRecording ? 'Listening...' : 
             appState === 'processing' ? 'Thinking...' : 
             appState === 'speaking' ? 'Playing Response' : 'Tap to speak with Nyaya'}
          </p>
          <span className="text-xs text-nyaya-muted block mt-1">
            {isRecording ? 'Tap the mic when finished' : 'न्याय से बात करें'}
          </span>
        </div>

        {/* Live visualizer bars shown during listening */}
        {isRecording && (
          <div className="flex items-center gap-1.5 h-6 mt-2">
            {[...Array(5)].map((_, i) => {
              // Scale heights by live amplitude
              const height = Math.max(4, amplitude * 24 * (i === 0 || i === 4 ? 0.6 : i === 1 || i === 3 ? 0.85 : 1));
              return (
                <div 
                  key={i}
                  className="w-1 bg-nyaya-green rounded-full transition-all duration-75"
                  style={{ height: `${height}px` }}
                ></div>
              );
            })}
          </div>
        )}
      </footer>

      {/* Suggested Lawyers Bottom Slide-up Panel */}
      {showLawyerPanel && (
        <div className="absolute inset-x-0 bottom-0 bg-[#0F1D14] border-t border-[#234330] rounded-t-3xl shadow-2xl p-6 animate-slide-up z-50 text-white">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                <Shield className="text-nyaya-green" size={20} />
                Need Legal Counsel?
              </h3>
              <p className="text-xs text-nyaya-muted mt-0.5">Based on your situation, speaking with a lawyer may help.</p>
            </div>
            <button 
              onClick={() => { setShowLawyerPanel(false); onClose(); }}
              className="p-1.5 bg-[#1C3225] hover:bg-[#284835] rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3 mb-5 max-h-[220px] overflow-y-auto pr-1">
            {suggestedLawyers.map(l => (
              <div 
                key={l.id}
                className="bg-[#142A1D] border border-[#234932] rounded-xl p-3.5 flex items-start justify-between hover:border-nyaya-green/40 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{l.full_name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {l.specialisations.map(s => (
                      <span key={s} className="text-[9px] bg-[#1E3F2B] text-nyaya-green font-semibold px-2 py-0.5 rounded capitalize">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-nyaya-muted">
                    <span className="flex items-center gap-0.5"><MapPin size={10} /> {l.city}, {l.state}</span>
                    <span>• {l.experience_years} yrs exp</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-xs text-amber-400 font-bold">
                    <Star size={11} fill="currentColor" /> {l.rating}
                  </div>
                  <span className="text-[10px] text-nyaya-muted block mt-1.5">
                    {l.offers_free_consultation ? 'Free Consultation' : `₹${l.fee_per_hour_inr}/hr`}
                  </span>
                  <a 
                    href="/lawyers"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-nyaya-green hover:underline mt-2 cursor-pointer"
                  >
                    <Phone size={9} /> Contact Advocate
                  </a>
                </div>
              </div>
            ))}
          </div>

          <a 
            href="/lawyers"
            className="w-full bg-nyaya-green hover:bg-nyaya-green-mid text-nyaya-dark font-bold text-xs py-3 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-nyaya-green/10"
          >
            Connect me with a lawyer →
          </a>
        </div>
      )}

    </div>
  );
}
