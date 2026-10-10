import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../../styles/theme';

export default function RoomCodeInput() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      navigate(`/room/${code.toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input 
        type="text" 
        maxLength={6}
        placeholder="ENTER ROOM CODE"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        style={{ padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }}
      />
      <button 
        type="submit"
        disabled={code.length !== 6}
        style={{ padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: code.length === 6 ? colors.secondary : colors.border, color: code.length === 6 ? 'white' : colors.textSecondary, fontSize: '16px', cursor: code.length === 6 ? 'pointer' : 'not-allowed' }}
      >
        Join Room
      </button>
    </form>
  );
}