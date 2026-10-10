import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { getSocket } from '../../socket/client';
import { colors } from '../../styles/theme';
import RoomCodeInput from './RoomCodeInput';

export default function LobbyPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createRoom = () => {
    setLoading(true);
    const socket = getSocket();
    socket.emit('room:create', (response) => {
      setLoading(false);
      if (response.ok && response.roomCode) {
        navigate(`/room/${response.roomCode}`);
      } else {
        alert(response.error || 'Failed to create room');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <h1 style={{ marginBottom: '10px' }}>Welcome, {user?.nickname}</h1>
      <p style={{ marginBottom: '30px', color: colors.textSecondary }}>Choose how you want to start focusing today.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '300px' }}>
        <button 
          onClick={createRoom}
          disabled={loading}
          style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: colors.primary, color: 'white', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        
        <div style={{ textAlign: 'center', margin: '10px 0', color: colors.textSecondary }}>OR</div>
        
        <RoomCodeInput />
        
        <Link to="/history" style={{ textAlign: 'center', marginTop: '20px', color: colors.primary, textDecoration: 'none' }}>
          View My History
        </Link>
      </div>
    </div>
  );
}