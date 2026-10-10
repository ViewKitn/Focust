import React, { useState } from 'react';
import { getSocket } from '../../socket/client';
import { colors } from '../../styles/theme';
import useRoomStore from '../../stores/roomStore';

export default function GoalForm() {
  const { myActiveSession } = useRoomStore();
  const [goal, setGoal] = useState(myActiveSession?.goalText || '');
  const [shared, setShared] = useState(myActiveSession?.goalShared || false);
  const [isEditing, setIsEditing] = useState(!myActiveSession?.goalText);
  const socket = getSocket();

  const handleSave = () => {
    if (!goal.trim()) return;
    socket.emit('session:set_goal', { goalText: goal.trim(), goalShared: shared }, (res) => {
      if (res && !res.ok) {
        alert(res.error || 'Failed to set goal');
      } else {
        useRoomStore.setState({
          myActiveSession: {
            sessionId: myActiveSession?.sessionId || '',
            goalText: goal.trim(),
            goalShared: shared
          }
        });
        setIsEditing(false);
      }
    });
  };

  if (!isEditing && myActiveSession?.goalText) {
    return (
      <div style={{ padding: '10px', backgroundColor: colors.background, borderRadius: '4px', marginBottom: '10px' }}>
        <p style={{ margin: 0, fontSize: '14px' }}><strong>Goal:</strong> {myActiveSession.goalText}</p>
        <button onClick={() => setIsEditing(true)} style={{ marginTop: '5px', padding: '4px 8px', fontSize: '12px', border: 'none', backgroundColor: colors.border, borderRadius: '4px', cursor: 'pointer' }}>Edit Goal</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
      <input 
        type="text" 
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What will you focus on?"
        maxLength={500}
        style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${colors.border}` }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        Share goal with table members
      </label>
      <button onClick={handleSave} disabled={!goal.trim()} style={{ padding: '8px', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: goal.trim() ? 'pointer' : 'not-allowed' }}>Save Goal</button>
    </div>
  );
}