import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../api/auth';
import useAuthStore from '../../stores/authStore';
import { colors } from '../../styles/theme';
import type { AvatarPreset } from '@connecta-focus/shared';

const presets: AvatarPreset[] = ['preset-1', 'preset-2', 'preset-3', 'preset-4'];
const presetColors = {
  'preset-1': '#FFB3BA',
  'preset-2': '#FFDFBA',
  'preset-3': '#FFFFBA',
  'preset-4': '#BAFFC9'
};

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>('preset-1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(email, password, nickname, avatarPreset);
      setAuth(data.user, data.token);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Register</h2>
      {error && <div style={{ color: colors.error, marginBottom: '10px' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}/>
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}/>
        <input type="text" placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}` }}/>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Avatar Preset</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {presets.map(preset => (
              <div 
                key={preset}
                onClick={() => setAvatarPreset(preset)}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: presetColors[preset],
                  border: avatarPreset === preset ? `3px solid ${colors.primary}` : '1px solid transparent',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: colors.primary, color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: colors.primary }}>Login</Link>
      </div>
    </div>
  );
}