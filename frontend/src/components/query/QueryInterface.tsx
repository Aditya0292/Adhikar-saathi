import { useState, useRef, useEffect } from 'react';
import { Zap, Search, ThumbsUp, ThumbsDown, Copy, ArrowUp, Sparkles, Paperclip, Plus, ChevronDown, Mic, MicOff, Volume2, VolumeX, Loader2, Map } from 'lucide-react';
import { LanguageSelector } from '../ui/LanguageSelector';
import { CitationCard } from '../ui/CitationCard';
import { NyayaBadge } from '../ui/NyayaBadge';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { VoiceAdviser } from './VoiceAdviser';
import { queryFast, queryVerified, QueryRequest } from '../../api/query';
import AdvocateMap from '../lawyer/AdvocateMap';

interface Citation {
  index: number;
  actName?: string;
  section?: string;
  caseName?: string;
  court?: string;
  year?: string;
  excerpt: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  mode?: 'fast' | 'verified';
  citations?: Citation[];
  confidence?: string;
  law?: string;
  accuracy?: number;
  query_type?: string;
  isVerified?: boolean;
  needs_lawyer?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  mode: 'fast' | 'verified';
  lang: string;
}

function InlineCitation({ num, citation }: { num: number; citation?: Citation }) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!citation) {
    return <span className="font-mono text-nyaya-green-bright font-bold">[{num}]</span>;
  }
  
  const title = citation.caseName 
    ? `${citation.caseName}${citation.court || citation.year ? ` (${[citation.court, citation.year].filter(Boolean).join(', ')})` : ''}`
    : `${citation.actName || 'Citation'}${citation.section ? ` - ${citation.section}` : ''}`;

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="mx-0.5 px-1.5 py-0.5 bg-nyaya-green/10 text-nyaya-green-bright hover:bg-nyaya-green/20 hover:text-nyaya-green font-bold font-mono text-xs rounded transition-all cursor-pointer select-none">
        [{num}]
      </span>
      {isHovered && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white text-slate-800 rounded-xl border border-black/8 shadow-lg p-3 text-xs pointer-events-none animate-fade-in font-sans font-normal leading-relaxed normal-case">
          <span className="block font-bold text-nyaya-text-dark mb-1">
            [{num}] {title}
          </span>
          <span className="block text-slate-500 line-clamp-3 italic">
            "{citation.excerpt}"
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-black/8 rotate-45 -mt-1"></span>
        </span>
      )}
    </span>
  );
}

const renderTextWithCitations = (text: string, citations?: Citation[]) => {
  const cleanText = text.replace(/\*\*/g, '');
  if (!citations || citations.length === 0) {
    return cleanText;
  }
  
  const regex = /\[(\d+)\]/g;
  const parts: any[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(cleanText)) !== null) {
    const matchIndex = match.index;
    const num = parseInt(match[1], 10);

    if (matchIndex > lastIndex) {
      parts.push(cleanText.substring(lastIndex, matchIndex));
    }

    const citation = citations.find(c => c.index === num);
    parts.push(
      <InlineCitation key={matchIndex} num={num} citation={citation} />
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleanText.length) {
    parts.push(cleanText.substring(lastIndex));
  }

  return parts.length > 0 ? parts : cleanText;
};

const SUGGESTIONS = [
  { title: "Tenant Eviction", desc: "Can a landlord evict me without a written notice?", query: "Can a landlord evict me without notice in Maharashtra?" },
  { title: "Domestic Cruelty", desc: "Understand IPC Section 498A and safety guidelines.", query: "What is IPC Section 498A and what are the Supreme Court guidelines on arrest?" },
  { title: "Property Claims", desc: "What is the limitation period for property suits?", query: "What is the limitation period for filing a property suit?" },
  { title: "Labor Overtime", desc: "What are my rights regarding overtime pay?", query: "What are my rights regarding overtime pay in India?" }
];

export function QueryInterface() {
  const [mode, setMode] = useState<'fast' | 'verified'>('fast');
  const [query, setQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVoiceAdviserOpen, setIsVoiceAdviserOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike'>>({});

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setFeedback(prev => {
      const next = { ...prev };
      if (next[msgId] === type) {
        delete next[msgId];
      } else {
        next[msgId] = type;
      }
      return next;
    });
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { speakingMsgId, isSpeechLoading, speak } = useTextToSpeech();

  const handleCopy = (msgId: string, text: string) => {
    const cleanText = text.replace(/\*\*/g, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText)
        .then(() => {
          setCopiedId(msgId);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          fallbackCopyText(msgId, cleanText);
        });
    } else {
      fallbackCopyText(msgId, cleanText);
    }
  };

  const fallbackCopyText = (msgId: string, text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob);
      if (selectedLang) {
        formData.append('language', selectedLang);
      }

      const response = await fetch('http://localhost:8000/api/v1/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        setQuery(data.text);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const { isRecording, startRecording, stopRecording, error: voiceError } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
  });

  // Load past sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adhikarsathi_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Adjust height of textarea dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [query]);

  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    localStorage.setItem('adhikarsathi_sessions', JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
  };



  const submitQuery = async (textToSubmit: string) => {
    const trimmed = textToSubmit.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setQuery('');
    setIsTyping(true);

    let activeId = currentSessionId;
    let isNewSession = false;
    if (!activeId) {
      activeId = Date.now().toString();
      setCurrentSessionId(activeId);
      isNewSession = true;
    }

    try {
      const req: QueryRequest = {
        query: trimmed,
        language: selectedLang,
        session_id: activeId
      };

      let assistantMsg: Message;

      if (mode === 'fast') {
        const response = await queryFast(req);
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: response.answer,
          mode: 'fast',
          law: response.category !== 'none' ? `Category: ${response.category}` : undefined,
          needs_lawyer: response.needs_lawyer
        };
      } else {
        const response = await queryVerified(req);
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: response.answer,
          mode: 'verified',
          citations: response.citations.map(c => ({
            index: c.index,
            actName: c.act_name,
            section: c.section,
            caseName: c.case_name,
            court: c.court,
            year: c.year,
            excerpt: c.excerpt
          })),
          confidence: `${response.confidence.charAt(0).toUpperCase() + response.confidence.slice(1)} Confidence · ${response.hallucination_guard_passed ? 'Verified' : 'Unverified'}`,
          accuracy: response.accuracy,
          query_type: response.query_type,
          isVerified: response.hallucination_guard_passed,
          needs_lawyer: response.needs_lawyer
        };
      }

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      const sessionTitle = isNewSession 
        ? (trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed)
        : (sessions.find(s => s.id === activeId)?.title || trimmed);

      const newSession: ChatSession = {
        id: activeId!,
        title: sessionTitle,
        timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        messages: finalMessages,
        mode: mode,
        lang: selectedLang
      };

      let updated: ChatSession[];
      if (isNewSession) {
        updated = [newSession, ...sessions];
      } else {
        updated = sessions.map(s => s.id === activeId ? newSession : s);
      }
      saveSessionsToStorage(updated);
    } catch (err: any) {
      console.error(err);
      let errorText = "Something went wrong. Please try again.";
      if (err.message?.includes('503')) {
        errorText = "This feature is being set up. Try Quick Mode for now.";
      }
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: errorText,
        mode: mode
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const switchSession = (sessionId: string) => {
    if (!sessionId) {
      startNewChat();
      return;
    }
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setMode(session.mode || 'fast');
      setSelectedLang(session.lang || 'en');
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuery(query);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[400px] bg-white rounded-3xl border border-black/5 shadow-xs overflow-hidden">
      
      {/* Session Header (Claude Premium Custom Dropdown) */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-black/[0.04] flex-shrink-0">
        
        {/* Left: Custom session selector dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.02] hover:bg-black/[0.05] border border-black/5 rounded-xl text-sm font-semibold text-nyaya-text-dark transition-all focus:outline-none cursor-pointer"
          >
            <Sparkles size={14} className="text-nyaya-green" />
            <span className="max-w-[150px] sm:max-w-[200px] truncate">
              {currentSession ? currentSession.title : 'New Chat'}
            </span>
            <ChevronDown size={14} className="text-nyaya-muted" />
          </button>
          
          {isHistoryOpen && (
            <>
              {/* Back Drop click handler to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)} />
              
              <div className="absolute left-0 mt-2 w-72 bg-white border border-black/8 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="px-4 py-2 border-b border-black/5">
                  <span className="text-[10px] font-bold text-nyaya-muted uppercase tracking-wider">Conversation History</span>
                </div>
                
                <div className="max-h-[250px] overflow-y-auto pt-1">
                  <button
                    onClick={() => { switchSession(''); setIsHistoryOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2 border-b border-black/[0.02] ${!currentSessionId ? 'bg-nyaya-green/5 text-nyaya-green' : 'text-nyaya-text-dark hover:bg-slate-50'}`}
                  >
                    <Plus size={14} /> Start a New Chat
                  </button>
                  
                  {sessions.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-nyaya-muted">
                      No previous chats found
                    </div>
                  ) : (
                    sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { switchSession(s.id); setIsHistoryOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-xs font-semibold flex flex-col gap-0.5 border-b border-black/[0.01] last:border-0 ${currentSessionId === s.id ? 'bg-nyaya-green/5 text-nyaya-green' : 'text-nyaya-text-dark hover:bg-slate-50'}`}
                      >
                        <span className="truncate w-full">{s.title}</span>
                        <span className="text-[9px] text-nyaya-muted font-medium">{s.timestamp}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsVoiceAdviserOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-nyaya-green/10 hover:bg-nyaya-green/20 text-nyaya-green text-xs font-bold rounded-xl transition-all focus:outline-none cursor-pointer"
            title="Start interactive voice conversation"
          >
            <Volume2 size={14} /> Talk to Nyaya
          </button>
          
          <button 
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/[0.03] hover:bg-black/[0.06] text-nyaya-text-dark text-xs font-bold rounded-xl transition-all focus:outline-none cursor-pointer"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/[0.15]">
        
        {messages.length === 0 ? (
          /* Claude / Grok Empty State */
          <div className="h-full flex flex-col justify-center items-center max-w-5xl mx-auto w-full text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-nyaya-green/10 flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Adhikar साथी Logo" className="h-8 w-auto object-contain" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-nyaya-text-dark font-bold tracking-tight mb-2">
              How can I help you with Indian law?
            </h2>
            <p className="text-sm text-nyaya-muted font-sans max-w-md mb-8 leading-relaxed">
              Ask a question about tenant rights, criminal defense, or draft documents with citation support.
            </p>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => submitQuery(s.query)}
                  className="p-4 bg-white rounded-2xl border border-black/5 hover:border-nyaya-green/30 hover:bg-nyaya-green/[0.01] hover:shadow-sm text-left transition-all duration-200 group cursor-pointer"
                >
                  <h4 className="text-sm font-semibold text-nyaya-text-dark mb-1 flex items-center gap-1 group-hover:text-nyaya-green">
                    {s.title}
                  </h4>
                  <p className="text-xs text-nyaya-muted leading-relaxed truncate">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message Thread List */
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {msg.sender === 'user' ? (
                  /* User Message Bubble */
                  <div className="flex justify-end">
                    <div className="bg-[#F3F3F2] text-nyaya-text-dark px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] font-sans text-sm md:text-[15px] leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  /* Assistant Message (Claude / Grok clean text style) */
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-nyaya-green/10 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <img src="/logo.png" alt="Adhikar साथी Avatar" className="h-5 w-auto object-contain" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        {msg.mode === 'fast' ? (
                          <NyayaBadge variant="fast"><Zap size={10}/> Quick</NyayaBadge>
                        ) : (
                          <div className="flex items-center gap-4 text-[11px] font-bold tracking-wide mb-2 mt-1">
                            <span className="text-nyaya-muted">Verified Accuracy:</span>
                            <span className="bg-nyaya-green-bright text-nyaya-dark px-2 py-0.5 rounded-sm">{msg.accuracy ?? '...'}</span>
                            
                            <span className="text-nyaya-muted">Verified:</span>
                            <span className={msg.isVerified ? "bg-green-100 text-green-800 px-2 py-0.5 rounded-sm" : "bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm"}>{msg.isVerified ? "Yes" : "No"}</span>
                            
                            <span className="text-nyaya-muted">Query Type:</span>
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-sm">{msg.query_type ?? '...'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="font-sans text-sm md:text-[15px] text-nyaya-text-dark leading-relaxed whitespace-pre-wrap">
                        {renderTextWithCitations(msg.text, msg.citations)}
                      </div>

                      {msg.law && (
                        <div className="inline-block px-2.5 py-1 bg-nyaya-warm text-nyaya-muted text-xs rounded border border-black/5 font-semibold">
                          {msg.law}
                        </div>
                      )}

                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-black/5">
                          <h4 className="text-[11px] font-bold text-nyaya-text-dark uppercase tracking-wider mb-3">Citations & Acts</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {msg.citations.map((cit, cIdx) => (
                              <CitationCard key={cIdx} {...cit} />
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.needs_lawyer && (
                        <div className="mt-4 border border-black/8 rounded-2xl overflow-hidden bg-white flex flex-col shadow-md max-w-2xl">
                          <div className="p-3 bg-nyaya-warm/60 flex items-center justify-between border-b border-black/5">
                            <div className="flex items-center gap-1.5 text-nyaya-text-dark">
                              <Map size={14} className="text-nyaya-green shrink-0" />
                              <span className="text-xs font-bold font-serif">Nearest Advocates for Legal Assistance (अधिवक्ता संपर्क)</span>
                            </div>
                            <a
                              href="/lawyers"
                              className="text-[10px] font-bold text-nyaya-green hover:text-nyaya-green-mid transition-colors flex items-center gap-0.5"
                            >
                              Open Full Finder &rarr;
                            </a>
                          </div>
                          
                          {/* 220px Inline Map Strip */}
                          <div className="h-[220px] w-full relative">
                            <AdvocateMap
                              mode="advocate"
                              showFilters={false}
                              className="!border-0 !rounded-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-2">
                        <button 
                          onClick={() => handleFeedback(msg.id, 'like')}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            feedback[msg.id] === 'like' 
                              ? 'text-nyaya-green bg-nyaya-green/10' 
                              : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                          }`}
                          title={feedback[msg.id] === 'like' ? "Thanks for your feedback!" : "Helpful"}
                        >
                          <ThumbsUp size={14} fill={feedback[msg.id] === 'like' ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id, 'dislike')}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            feedback[msg.id] === 'dislike' 
                              ? 'text-red-600 bg-red-50' 
                              : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                          }`}
                          title={feedback[msg.id] === 'dislike' ? "Thanks for your feedback!" : "Not Helpful"}
                        >
                          <ThumbsDown size={14} fill={feedback[msg.id] === 'dislike' ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={() => handleCopy(msg.id, msg.text)} 
                          className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                            copiedId === msg.id 
                              ? 'text-nyaya-green bg-nyaya-green/10' 
                              : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                          }`}
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? (
                            <span className="text-[10px] font-bold px-1">Copied!</span>
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button 
                          onClick={() => speak(msg.id, msg.text, selectedLang)} 
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            speakingMsgId === msg.id 
                              ? 'text-nyaya-green bg-nyaya-green/5' 
                              : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                          }`}
                          title={
                            speakingMsgId === msg.id 
                              ? isSpeechLoading 
                                ? "Loading Audio..." 
                                : "Stop Speaking" 
                              : "Read Aloud"
                          }
                        >
                          {speakingMsgId === msg.id ? (
                            isSpeechLoading ? (
                              <Loader2 size={14} className="animate-spin text-nyaya-green-bright" />
                            ) : (
                              <VolumeX size={14} />
                            )
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              /* Claude Pulsing Typing Indicator */
              <div className="flex gap-4 items-center max-w-6xl mx-auto">
                <div className="w-8 h-8 rounded-full bg-nyaya-green/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img src="/logo.png" alt="Adhikar साथी Avatar" className="h-5 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-1.5 py-2.5 px-4 bg-white border border-black/5 rounded-2xl">
                  <span className="w-1.5 h-1.5 bg-nyaya-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-nyaya-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-nyaya-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Chat Input Form (Claude/Grok unified container) */}
      <div className="p-6 bg-white border-t border-black/[0.04]">
        <div className="max-w-6xl mx-auto bg-white border border-black/8 focus-within:border-black/20 focus-within:ring-4 focus-within:ring-nyaya-green/5 rounded-2xl shadow-sm transition-all duration-200">
          
          {/* Voice error banner */}
          {voiceError && (
            <div className="text-xs text-red-500 font-medium px-4 pt-2">
              Microphone error: {voiceError}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={isTranscribing ? 'Transcribing audio...' : query}
            disabled={isTranscribing}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTranscribing ? 'Please wait, transcribing voice...' : 'Ask a legal question... (Press Enter to Send)'}
            className="w-full resize-none outline-none font-sans text-sm md:text-base text-nyaya-text-dark placeholder-nyaya-muted bg-transparent px-4 pt-3 pb-1 max-h-[180px]"
            rows={1}
          />

          {/* Actions Footer */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-3">
              <LanguageSelector value={selectedLang} onChange={setSelectedLang} />
              
              <div className="h-4 w-px bg-black/10 hidden sm:block"></div>
              
              {/* Mode Toggles */}
              <div className="flex items-center gap-0.5 bg-black/5 rounded-full p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('fast')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'fast' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-nyaya-muted hover:text-nyaya-text-dark'
                  }`}
                >
                  <Zap size={11} /> Quick
                </button>
                <button
                  type="button"
                  onClick={() => setMode('verified')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'verified' ? 'bg-white shadow-xs text-nyaya-green font-bold' : 'text-nyaya-muted hover:text-nyaya-text-dark'
                  }`}
                >
                  <Search size={11} /> Verified
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isRecording 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 animate-pulse' 
                    : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                }`}
                title={isRecording ? 'Stop recording' : 'Record voice query'}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              <button 
                type="button"
                className="p-1.5 text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5 rounded-lg transition-all cursor-pointer"
                title="Upload reference files"
              >
                <Paperclip size={16} />
              </button>
              
              <button
                type="button"
                onClick={() => submitQuery(query)}
                disabled={!query.trim() || isTranscribing || isRecording}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  query.trim() && !isTranscribing && !isRecording
                    ? 'bg-nyaya-green text-white hover:bg-nyaya-green-dark shadow-sm cursor-pointer' 
                    : 'bg-black/5 text-black/20 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>

        </div>
        <div className="text-[10px] text-nyaya-muted text-center mt-2 font-medium">
          Adhikar साथी can make mistakes. Verify legal advice with our certified advocates.
        </div>
      </div>

      <VoiceAdviser 
        isOpen={isVoiceAdviserOpen}
        onClose={() => setIsVoiceAdviserOpen(false)}
        lang={selectedLang}
      />
    </div>
  );
}
