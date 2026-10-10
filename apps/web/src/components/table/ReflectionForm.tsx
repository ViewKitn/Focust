import React, { useState } from 'react';
import { submitReflection } from '../../api/sessions';
import useRoomStore from '../../stores/roomStore';
import { colors } from '../../styles/theme';
import type { GoalOutcome } from '@connecta-focus/shared';

export default function ReflectionForm({ sessionId }: { sessionId: string }) {
  const [outcome, setOutcome] = useState<GoalOutcome | ''>('');
  const [obstacles, setObstacles] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [loading, setLoading] = useState(false);
  const setRoomState = useRoomStore(state => state.setRoomState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) return;
    
    setLoading(true);
    try {
      await submitReflection(sessionId, { outcome: outcome as GoalOutcome, obstacles, nextSteps });
      useRoomStore.setState({ pendingReflectionSessionId: null });
    } catch (err) {
      console.error(err);
      alert('Failed to submit reflection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ margin: 0 }}>Session Reflection</h3>
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Goal Outcome</label>
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as GoalOutcome)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
          <option value="" disabled>Select outcome...</option>
          <option value="achieved">Achieved ✓</option>
          <option value="partial">Partial ~</option>
          <option value="not_achieved">Not Achieved ✗</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>อุปสรรค (Optional)</label>
        <textarea value={obstacles} onChange={(e) => setObstacles(e.target.value)} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}` }} />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>สิ่งที่จะทำต่อ (Optional)</label>
        <textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}` }} />
      </div>
      
      <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0 }}>Obstacles and next steps are private.</p>

      <button type="submit" disabled={loading || !outcome} style={{ padding: '10px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: (loading || !outcome) ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Submitting...' : 'Submit Reflection'}
      </button>
    </form>
  );
}