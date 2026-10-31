import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Globe, Play, Radio, Loader2 } from 'lucide-react';
import { Channel } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  groundingSources?: Array<{ web?: { uri: string; title: string } }>;
  suggestedChannel?: Channel;
}

interface AiStreamChatProps {
  onSelectChannel?: (channel: Channel) => void;
  activeCountryName: string;
}

export const AiStreamChat: React.FC<AiStreamChatProps> = ({
  onSelectChannel,
  activeCountryName
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello! I am **Yocare AI Live Stream Radar**. Ask me to find live streams for any channel in ${activeCountryName} or worldwide, check what's playing on air, or request specific live broadcasts!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputMessage).trim();
    if (!promptText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          messages: messages.map((m) => ({ role: m.sender, content: m.text }))
        })
      });

      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || 'I found live broadcast information for your query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: data.groundingChunks || []
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'I am currently checking live broadcast sources. Please select any channel from the guide to play its active stream immediately!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const promptSuggestions = [
    `Find live news channels in ${activeCountryName}`,
    `Show sports & cricket live feeds`,
    `What music channels are streaming now?`
  ];

  return (
    <>
      {/* Floating Widget Trigger Button */}
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-[#d5f477] to-[#a6dfaa] text-[#11140c] font-bold text-xs shadow-2xl flex items-center gap-2 hover:scale-105 transition-all cursor-pointer border-0"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Stream Assistant"
      >
        <Sparkles className="w-4 h-4 fill-current text-[#11140c]" />
        <span>Ask AI Stream Assistant</span>
        <span className="w-2 h-2 rounded-full bg-[#11140c] animate-pulse"></span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-full max-w-md bg-[#101715] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] text-white">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#18211e] to-[#0d1310] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#d5f477] text-[#11140c] flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold m-0 text-white flex items-center gap-1.5">
                  Yocare AI Stream Radar <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d5f477]/20 text-[#d5f477]">Live Search</span>
                </h3>
                <p className="text-[10px] text-[#a0aea5] m-0">Powered by Gemini with Google Search Grounding</p>
              </div>
            </div>

            <button
              type="button"
              className="text-[#a0aea5] hover:text-white bg-transparent border-0 cursor-pointer p-1"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#d5f477]/20 text-[#d5f477] flex items-center justify-center flex-none mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#d5f477] text-[#11140c] font-medium rounded-tr-none'
                      : 'bg-[#18211e] text-[#f3f5ef] border border-white/10 rounded-tl-none'
                  }`}
                >
                  <p className="m-0 whitespace-pre-wrap">{m.text}</p>

                  {/* Grounding Citations */}
                  {m.groundingSources && m.groundingSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-[#a0aea5]">
                      <span className="font-semibold text-[#d5f477] block mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Live Search Sources:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.groundingSources.slice(0, 3).map((chunk, idx) => (
                          chunk.web?.uri ? (
                            <a
                              key={idx}
                              href={chunk.web.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[#d5f477] underline truncate max-w-[180px] inline-block"
                            >
                              {chunk.web.title || 'Source'}
                            </a>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}

                  <span
                    className={`text-[9px] block text-right mt-1 opacity-70 ${
                      m.sender === 'user' ? 'text-black/60' : 'text-[#85978b]'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center flex-none mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#d5f477]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching live streams and broadcast radar...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3 py-2 bg-[#090e0c] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto text-[10px]">
            {promptSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-[#d5f477] hover:text-[#11140c] text-[#a0aea5] flex-none transition-colors border-0 cursor-pointer"
                onClick={() => handleSendMessage(sug)}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#0d1310] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              className="flex-1 h-9 px-3 text-xs rounded-full bg-[#18211e] border border-white/15 text-white focus:border-[#d5f477] outline-none placeholder-[#6f7e76]"
              placeholder="Ask about live channels, schedules or streams..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="w-9 h-9 rounded-full bg-[#d5f477] text-[#11140c] flex items-center justify-center flex-none disabled:opacity-40 cursor-pointer border-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
