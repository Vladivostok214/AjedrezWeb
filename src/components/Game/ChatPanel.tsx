import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  sender: 'tú' | 'rival' | 'sistema';
  text: string;
  time: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  disabled = false 
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Scroll automático hacia abajo al recibir nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/5 bg-black/40">
      {/* Cabecera del Chat */}
      <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Chat de Partida</span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
      </div>

      {/* Lista de Mensajes */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-[10px] text-gray-600 italic">
            No hay mensajes. ¡Saluda a tu rival!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isSelf = msg.sender === 'tú';
            const isSystem = msg.sender === 'sistema';
            
            return (
              <div 
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  isSelf ? 'self-end items-end' : isSystem ? 'self-center items-center w-full' : 'self-start items-start'
                }`}
              >
                <div 
                  className={`px-3 py-1.5 rounded-xl text-xs leading-relaxed ${
                    isSelf 
                      ? 'bg-accent-violet text-white rounded-tr-none' 
                      : isSystem
                      ? 'bg-neutral-900/60 border border-white/5 text-gray-500 rounded-none italic text-[10px] text-center w-full'
                      : 'bg-neutral-800 text-gray-200 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
                {!isSystem && (
                  <span className="text-[8px] text-gray-600 mt-0.5 px-1 font-mono">
                    {msg.time}
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de Entrada */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/5 bg-black/20 flex gap-2">
        <input
          type="text"
          placeholder={disabled ? "Chat desactivado..." : "Escribe un mensaje..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-accent-violet focus:ring-1 focus:ring-accent-violet transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !inputText.trim()}
          className="px-3 py-1.5 bg-accent-violet hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:hover:bg-accent-violet cursor-pointer"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
