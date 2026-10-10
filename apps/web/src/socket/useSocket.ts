import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket, TypedSocket } from './client';
import useRoomStore from '../stores/roomStore';
import useChatStore from '../stores/chatStore';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export function useSocket(): TypedSocket | null {
  const { token, logout } = useAuthStore();
  const roomStore = useRoomStore();
  const chatStore = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('auth:tab_replaced', () => {
      alert('You have logged in from another tab.');
      logout();
      navigate('/login');
    });

    socket.on('room:state', (state) => {
      roomStore.setRoomState(state);
    });

    socket.on('room:member_joined', (member) => {
      roomStore.updateMember(member);
    });

    socket.on('room:member_left', (data) => {
      roomStore.removeMember(data.userId);
    });

    socket.on('room:member_moved', (data) => {
      roomStore.updateMemberPosition(data.userId, data.position);
    });

    socket.on('room:member_seated', (data) => {
      roomStore.updateMemberSeat(data.userId, data.tableIndex, data.seatIndex);
    });

    socket.on('room:member_stood', (data) => {
      roomStore.updateMemberStood(data.userId);
    });

    socket.on('table:state_changed', (data) => {
      roomStore.updateTableState(data.tableIndex, data.table);
    });

    socket.on('room:closed', () => {
      alert('Room was closed');
      roomStore.clearRoom();
      navigate('/lobby');
    });

    socket.on('chat:message', (message) => {
      chatStore.addMessage(message, useAuthStore.getState().user?.id || '');
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      alert('Error: ' + err.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('auth:tab_replaced');
      socket.off('room:state');
      socket.off('room:member_joined');
      socket.off('room:member_left');
      socket.off('room:member_moved');
      socket.off('room:member_seated');
      socket.off('room:member_stood');
      socket.off('table:state_changed');
      socket.off('room:closed');
      socket.off('chat:message');
      socket.off('error');
    };
  }, [token]);

  return getSocket();
}