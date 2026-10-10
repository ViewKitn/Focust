import React from 'react';
import { getSocket } from '../../socket/client';
import { colors } from '../../styles/theme';
import type { TableState, SeatState } from '@connecta-focus/shared';
import useRoomStore from '../../stores/roomStore';
import useAuthStore from '../../stores/authStore';

export default function ReadyButton({ table, isTableOwner }: { table: TableState, mySeat: SeatState, isTableOwner: boolean }) {
  const socket = getSocket();
  const { members, mySessionStatus, setMySessionStatus } = useRoomStore();
  const { user } = useAuthStore();

  const isReady = mySessionStatus === 'ready';

  const handleToggleReady = () => {
    socket.emit('session:ready', (res) => {
      if (res && !res.ok) {
        alert(res.error || 'Failed to ready up');
      } else {
        setMySessionStatus('ready');
      }
    });
  };

  const handleStartSession = () => {
    socket.emit('session:start', (res) => {
      if (res && !res.ok) {
        alert(res.error || 'Failed to start session');
      }
    });
  };

  const occupiedSeats = table.seats.filter(s => s.userId);
  const allReady = occupiedSeats.length > 0 && occupiedSeats.every(s => {
    const member = members.find(m => m.userId === s.userId);
    return member?.sessionStatus === 'ready' || (s.userId === user?.id && isReady);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button 
        onClick={handleToggleReady}
        style={{ 
          padding: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
          backgroundColor: isReady ? colors.success : colors.border,
          color: isReady ? 'white' : colors.text
        }}
      >
        {isReady ? 'Ready ✓' : 'Click when ready'}
      </button>

      {isTableOwner && (
        <button 
          onClick={handleStartSession}
          disabled={!allReady}
          style={{ 
            padding: '10px', borderRadius: '4px', border: 'none', cursor: allReady ? 'pointer' : 'not-allowed', fontWeight: 'bold',
            backgroundColor: allReady ? colors.primary : colors.border,
            color: allReady ? 'white' : colors.textSecondary
          }}
        >
          Start Session
        </button>
      )}
    </div>
  );
}