import React from 'react';
import useChatStore from '../../stores/chatStore';
import { colors } from '../../styles/theme';

export default function ChatBubble() {
  const { togglePanel, isOpen, unreadCount } = useChatStore();

  if (isOpen) return null;

  return (
    <button
      onClick={togglePanel}
      style={{
        position: 'absolute', bottom: '20px', right: '20px', width: '60px', height: '60px',
        borderRadius: '50%', backgroundColor: colors.primary, border: 'none',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer', pointerEvents: 'auto',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
    >
      <span style={{ fontSize: '24px' }}>💬</span>
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: '0', right: '0', backgroundColor: colors.error, color: 'white',
          borderRadius: '10px', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold'
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}