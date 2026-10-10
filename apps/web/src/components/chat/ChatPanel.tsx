import React, { useState, useRef, useEffect } from 'react';
import useChatStore from '../../stores/chatStore';
import useAuthStore from '../../stores/authStore';
import { getSocket } from '../../socket/client';
import { colors } from '../../styles/theme';
import ChatMessageItem from './ChatMessage';
import { useKeyboard } from '../../hooks/useKeyboard';

export default function ChatPanel() {
  const { isOpen, messages, closePanel } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setIsTyping } = useKeyboard();
  const socket = getSocket();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    socket.emit('chat:send', { text: text.trim() }, (res) => {
      if (res && !res.ok && res.error) {
        alert(res.error);
      }
    });
    setText('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute', bottom: '20px', right: '20px', width: '320px', height: '400px',
      backgroundColor: colors.surface, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', pointerEvents: 'auto', border: `1px solid ${colors.border}`, overflow: 'hidden'
    }}>
      <div style={{ padding: '15px', backgroundColor: colors.primary, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Room Chat</h3>
        <button onClick={closePanel} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} isOwn={msg.userId === user?.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '10px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}` }}
        />
        <button type="submit" disabled={!text.trim()} style={{ padding: '8px 12px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: text.trim() ? 'pointer' : 'not-allowed' }}>Send</button>
      </form>
    </div>
  );
}