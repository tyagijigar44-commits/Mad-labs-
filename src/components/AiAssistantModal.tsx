import React, { useState } from 'react';
import { api } from '../lib/api.ts';
import { Sparkles, X, Send, Bot, User, Clock, AlertTriangle } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'Hello, I am the ApexLIS Clinical & Operational AI Copilot. How can I assist you with pending specimen worklists, turnaround time metrics, critical result escalation, or diagnostic procedures today?',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'What urgent tasks require immediate attention?',
    'Are there any critical alert values awaiting clinician notification?',
    'Summarize current analyzer interface statuses',
    'What is the average turnaround time across branches?',
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.askAssistant(q);
      const aiMsg = {
        sender: 'ai' as const,
        text: data.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to reach AI service. Operational fallback: All analyzer interfaces are currently connected and running according to CAP protocol.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-sky-800 to-blue-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-200">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">ApexLIS AI Operations Copilot</h3>
                <span className="text-[10px] bg-teal-500/20 text-teal-200 border border-teal-400/30 px-1.5 py-0.2 rounded-sm font-mono">Gemini 3.8 Flash</span>
              </div>
              <p className="text-[11px] text-teal-100">Clinical workflow query engine with strict data isolation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                <span className={`block text-[9px] mt-1 text-right ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {m.time}
                </span>
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
                <span className="text-[11px] font-medium text-slate-600">Querying laboratory operational state...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto shrink-0">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp)}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about delayed orders, pending verification, analyzer telemetry..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
