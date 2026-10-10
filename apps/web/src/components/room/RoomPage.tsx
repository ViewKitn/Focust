import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../socket/useSocket';
import useRoomStore from '../../stores/roomStore';
import GameCanvas from '../game/GameCanvas';
import RoomOverlay from './RoomOverlay';
import { colors } from '../../styles/theme';

export default function RoomPage() {
  const { roomCode: roomCodeParam } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const [joining, setJoining] = useState(true);
  const roomCode = useRoomStore(state => state.roomCode);
  const setRoomState = useRoomStore(state => state.setRoomState);

  useEffect(() => {
    if (!socket || !roomCodeParam) return;

    socket.emit('room:join', { roomCode: roomCodeParam.toUpperCase() }, (response) => {
      setJoining(false);
      if (response && response.ok && response.room) {
        setRoomState(response.room);
      } else {
        alert(response?.error || 'Failed to join room');
        navigate('/lobby');
      }
    });

    return () => {
      socket.emit('room:leave');
    };
  }, [socket, roomCodeParam, navigate]);

  if (joining || !roomCode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: colors.background }}>
        <h2>Joining Room...</h2>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <GameCanvas />
      <RoomOverlay />
    </div>
  );
}
