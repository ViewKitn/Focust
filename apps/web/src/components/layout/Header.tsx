import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { colors } from '../../styles/theme';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primary }}>
        <Link to="/lobby" style={{ textDecoration: 'none', color: 'inherit' }}>Connecta Focus</Link>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/lobby" style={{ textDecoration: 'none', color: colors.text }}>Lobby</Link>
        <Link to="/history" style={{ textDecoration: 'none', color: colors.text }}>History</Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '20px', paddingLeft: '20px', borderLeft: `1px solid ${colors.border}` }}>
          <span style={{ fontWeight: '500' }}>{user?.nickname}</span>
          <button onClick={handleLogout} style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${colors.error}`, backgroundColor: 'transparent', color: colors.error, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>
    </header>
  );
}