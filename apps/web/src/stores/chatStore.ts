import { create } from 'zustand';
import type { ChatMessage } from '@connecta-focus/shared';

interface ChatStoreState {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadCount: number;
  lastReadTimestamp: Date | null;
  
  addMessage: (msg: ChatMessage, myUserId: string) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  markAsRead: () => void;
  clearMessages: () => void;
}

const useChatStore = create<ChatStoreState>((set) => ({
  messages: [],
  isOpen: false,
  unreadCount: 0,
  lastReadTimestamp: null,

  addMessage: (msg, myUserId) => set((state) => {
    const isUnread = !state.isOpen && msg.userId !== myUserId;
    return {
      messages: [...state.messages, msg],
      unreadCount: isUnread ? state.unreadCount + 1 : state.unreadCount
    };
  }),
  setMessages: (msgs) => set({ messages: msgs }),
  togglePanel: () => set((state) => {
    const willOpen = !state.isOpen;
    return {
      isOpen: willOpen,
      unreadCount: willOpen ? 0 : state.unreadCount,
      lastReadTimestamp: willOpen ? new Date() : state.lastReadTimestamp
    };
  }),
  openPanel: () => set({ isOpen: true, unreadCount: 0, lastReadTimestamp: new Date() }),
  closePanel: () => set({ isOpen: false }),
  markAsRead: () => set({ unreadCount: 0, lastReadTimestamp: new Date() }),
  clearMessages: () => set({ messages: [], unreadCount: 0 })
}));

export default useChatStore;