import { useState, useRef, useEffect } from 'react';
import { Zap, Search, ThumbsUp, ThumbsDown, Copy, ArrowUp, Sparkles, Paperclip, Plus, ChevronDown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { LanguageSelector } from '../ui/LanguageSelector';
import { CitationCard } from '../ui/CitationCard';
import { NyayaBadge } from '../ui/NyayaBadge';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { VoiceAdviser } from './VoiceAdviser';

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
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  mode: 'fast' | 'verified';
  lang: string;
}

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { speakingMsgId, speak } = useTextToSpeech();

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
    const saved = localStorage.getItem('nyayasatya_sessions');
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
    localStorage.setItem('nyayasatya_sessions', JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
  };

  const getMockResponse = (q: string, lang: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('tenant') || lower.includes('rent') || lower.includes('evict') || lower.includes('किराया') || lower.includes('किरायेदार')) {
      if (lang === 'hi') {
        return {
          text: "नहीं। महाराष्ट्र किराया नियंत्रण अधिनियम, 1999 के तहत किसी भी किरायेदार को उचित नोटिस के बिना जबरन नहीं निकाला जा सकता। मकान मालिक को कानून के अनुसार लिखित नोटिस देना अनिवार्य है। यदि किरायेदार किराया देने को तैयार है, तो उसे कानूनी प्रक्रिया के बिना बेदखल नहीं किया जा सकता।",
          law: "कानून: महाराष्ट्र किराया नियंत्रण अधिनियम, 1999",
          citations: [
            { index: 1, actName: "महाराष्ट्र किराया नियंत्रण अधिनियम, 1999", section: "धारा 15", excerpt: "जब तक किरायेदार किराया देने के लिए तैयार और इच्छुक है, तब तक कोई भी मकान मालिक मकान खाली कराने का हकदार नहीं होगा..." }
          ]
        };
      } else {
        return {
          text: "No. Under the Maharashtra Rent Control Act, 1999, a tenant cannot be evicted without a proper written notice. The landlord must follow the due process of law and provide adequate notice (typically 30 to 90 days depending on the agreement terms) before initiating eviction proceedings in court.",
          law: "Law: Maharashtra Rent Control Act, 1999",
          citations: [
            { index: 1, actName: "Maharashtra Rent Control Act, 1999", section: "Section 15", excerpt: "No landlord shall be entitled to the recovery of possession of any premises so long as the tenant pays or is ready and willing to pay..." }
          ]
        };
      }
    } else if (lower.includes('498') || lower.includes('cruelty') || lower.includes('arrest') || lower.includes('क्रूरता') || lower.includes('गिरफ्तारी')) {
      if (lang === 'hi') {
        return {
          text: "भारतीय कानून (IPC धारा 498A) के तहत, यदि किसी महिला का पति या पति का कोई रिश्तेदार उस महिला के प्रति क्रूरता करता है, तो उसे कारावास से दंडित किया जाएगा जिसकी अवधि तीन वर्ष तक हो सकती है और जुर्माना भी देना होगा। हालांकि, अर्णेश कुमार बनाम बिहार राज्य (2014) के मामले में सुप्रीम कोर्ट ने मनमानी गिरफ्तारियों और इस कानून के दुरुपयोग को रोकने के लिए सख्त निर्देश जारी किए हैं। इसके तहत 7 साल से कम सजा वाले अपराधों में बिना मजिस्ट्रेट के आदेश के सीधे गिरफ्तारी नहीं होनी चाहिए।",
          citations: [
            { index: 1, actName: "भारतीय दंड संहिता", section: "धारा 498A", excerpt: "महिला के पति या पति के रिश्तेदार द्वारा उसके साथ क्रूरता करना..." },
            { index: 2, caseName: "अर्णेश कुमार बनाम बिहार राज्य", court: "सुप्रीम कोर्ट", year: "2014", excerpt: "दहेज प्रताड़ना के मामलों में पुलिस को निर्देश दिया जाता है कि वे आरोपी को सीधे गिरफ्तार न करें, बल्कि पहले धारा 41ए के तहत नोटिस जारी करें।" }
          ],
          confidence: "उच्च सटीकता · मतिभ्रम (Hallucination) सुरक्षा जांच उत्तीर्ण"
        };
      } else {
        return {
          text: "Under Indian law (IPC Section 498A), whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine. Cruelty includes mental and physical harassment, particularly related to dowry demands. However, in the landmark case of Arnesh Kumar v. State of Bihar (2014), the Supreme Court laid down strict guidelines to prevent misuse and arbitrary arrests, requiring police to serve a notice of appearance (under Section 41A CrPC) rather than conducting immediate arrests.",
          citations: [
            { index: 1, actName: "Indian Penal Code", section: "Section 498A", excerpt: "Husband or relative of husband of a woman subjecting her to cruelty..." },
            { index: 2, caseName: "Arnesh Kumar v. State of Bihar", court: "SC", year: "2014", excerpt: "Guidelines established to prevent arbitrary and immediate arrests for offences carrying less than 7 years imprisonment." }
          ],
          confidence: "High Confidence · Hallucination guard passed"
        };
      }
    } else {
      // Fallback response
      if (lang === 'hi') {
        return {
          text: `आपके प्रश्न "${q}" के संबंध में: भारतीय नागरिक अधिकारों और कानूनी ढांचे के तहत प्रत्येक नागरिक को न्याय और मुफ्त कानूनी सलाह पाने का अधिकार है (अनुच्छेद 39A)। आपके द्वारा पूछे गए विषय पर विस्तृत जानकारी एकत्रित की जा रही है। तब तक, कृपया अपने क्षेत्र के प्रमाणित वकील से परामर्श लें या हमारे "Find a Lawyer" सेक्शन का उपयोग करें।`,
          law: "भारतीय संविधान - अनुच्छेद 39A (समान न्याय और मुफ्त कानूनी सहायता)",
          citations: []
        };
      } else {
        return {
          text: `Regarding your query "${q}": Under the Indian legal framework, every citizen is entitled to equal justice and free legal aid. For this specific request, our verified RAG engine recommends referring to the codified laws of India. If your situation is urgent, please click the "Find a Lawyer" tab to consult a registered advocate in your city.`,
          law: "Constitution of India - Article 39A (Equal justice and free legal aid)",
          citations: []
        };
      }
    }
  };

  const submitQuery = (textToSubmit: string) => {
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

    setTimeout(() => {
      const responseData = getMockResponse(trimmed, selectedLang);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: responseData.text,
        mode: mode,
        citations: responseData.citations,
        confidence: responseData.confidence,
        law: responseData.law
      };
      setIsTyping(false);
      
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
    }, 1500);
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
    <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-3xl border border-black/5 shadow-xs overflow-hidden">
      
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
          <div className="h-full flex flex-col justify-center items-center max-w-2xl mx-auto text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-nyaya-green/10 flex items-center justify-center mb-4">
              <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain" />
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

            {/* Previous Chats History list (on empty screen) */}
            {sessions.length > 0 && (
              <div className="w-full mt-8 pt-8 border-t border-black/5 text-left">
                <h4 className="text-[10px] font-bold text-nyaya-muted uppercase tracking-wider mb-3">Recent Conversations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {sessions.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      onClick={() => switchSession(s.id)}
                      className="w-full p-3 bg-white hover:bg-slate-50 border border-black/5 rounded-xl text-left text-xs text-nyaya-text-dark font-semibold transition-colors truncate flex flex-col gap-1 shadow-2xs cursor-pointer"
                    >
                      <span className="truncate w-full">{s.title}</span>
                      <span className="text-[9px] text-nyaya-muted font-medium">{s.timestamp}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Message Thread List */
          <div className="max-w-3xl mx-auto space-y-8">
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
                      <img src="/logo.png" alt="NyayaSatya Avatar" className="h-5 w-auto object-contain" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        {msg.mode === 'fast' ? (
                          <NyayaBadge variant="fast"><Zap size={10}/> Quick</NyayaBadge>
                        ) : (
                          <NyayaBadge variant="verified"><Search size={10}/> Verified RAG</NyayaBadge>
                        )}
                      </div>
                      
                      <div className="font-sans text-sm md:text-[15px] text-nyaya-text-dark leading-relaxed whitespace-pre-wrap">
                        {msg.text}
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

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-2">
                        <button className="p-2 text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5 rounded-lg transition-colors cursor-pointer" title="Helpful">
                          <ThumbsUp size={14} />
                        </button>
                        <button className="p-2 text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5 rounded-lg transition-colors cursor-pointer" title="Not Helpful">
                          <ThumbsDown size={14} />
                        </button>
                        <button 
                          onClick={() => navigator.clipboard.writeText(msg.text)} 
                          className="p-2 text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5 rounded-lg transition-colors cursor-pointer" 
                          title="Copy Answer"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          onClick={() => speak(msg.id, msg.text, selectedLang)} 
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            speakingMsgId === msg.id 
                              ? 'text-nyaya-green bg-nyaya-green/5' 
                              : 'text-nyaya-muted hover:text-nyaya-text-dark hover:bg-black/5'
                          }`}
                          title={speakingMsgId === msg.id ? "Stop Speaking" : "Read Aloud"}
                        >
                          {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              /* Claude Pulsing Typing Indicator */
              <div className="flex gap-4 items-center max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-full bg-nyaya-green/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img src="/logo.png" alt="NyayaSatya Avatar" className="h-5 w-auto object-contain" />
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
        <div className="max-w-3xl mx-auto bg-white border border-black/8 focus-within:border-black/20 focus-within:ring-4 focus-within:ring-nyaya-green/5 rounded-2xl shadow-sm transition-all duration-200">
          
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
          NyayaSatya can make mistakes. Verify legal advice with our certified advocates.
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
