import React from 'react';
import type { ChatMessage as ChatMessageType } from '@connecta-focus/shared';
import { colors } from '../../styles/theme';
import { formatTime } from '../../utils/format';

export default function ChatMessage({ message, isOwn }: { message: ChatMessageType, isOwn: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
      <span style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '2px' }}>
        {isOwn ? 'You' : message.nickname}
      </span>
      <div style={{
        backgroundColor: isOwn ? colors.primary : colors.background,
        color: isOwn ? 'white' : colors.text,
        padding: '8px 12px',
        borderRadius: '12px',
        borderBottomRightRadius: isOwn ? '2px' : '12px',
        borderBottomLeftRadius: isOwn ? '12px' : '2px',
        maxWidth: '85%',
        wordBreak: 'break-word'
      }}>
        {message.text}
      </div>
      <span style={{ fontSize: '10px', color: colors.textSecondary, marginTop: '2px' }}>
        {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}