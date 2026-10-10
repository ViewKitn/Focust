import { db } from '../db';
import { chatMessages } from '../db/schema';
import { ChatMessage, MAX_CHAT_MESSAGES, MAX_CHAT_MESSAGE_LENGTH } from '@connecta-focus/shared';
import crypto from 'crypto';

const roomChatHistory = new Map<string, ChatMessage[]>();

export function addMessage(roomId: string, userId: string, nickname: string, text: string): ChatMessage {
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error('Message too long');
  }

  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    roomId,
    userId,
    nickname,
    text,
    sentAt: new Date()
  };

  let history = roomChatHistory.get(roomId);
  if (!history) {
    history = [];
    roomChatHistory.set(roomId, history);
  }

  history.push(msg);
  if (history.length > MAX_CHAT_MESSAGES) {
    history.shift();
  }

  // Fire and forget db insert
  db.insert(chatMessages).values({
    id: msg.id,
    roomId: msg.roomId,
    userId: msg.userId,
    nickname: msg.nickname,
    text: msg.text,
    sentAt: msg.sentAt
  }).execute().catch(console.error);

  return msg;
}

export function getChatHistory(roomId: string): ChatMessage[] {
  return roomChatHistory.get(roomId) || [];
}
