import React from 'react';
import useRoomStore from '../../stores/roomStore';
import { colors } from '../../styles/theme';
import GoalForm from './GoalForm';
import ReadyButton from './ReadyButton';
import FocusTimer from './FocusTimer';
import ReflectionForm from './ReflectionForm';
import { getSocket } from '../../socket/client';
import useAuthStore from '../../stores/authStore';

export default function TablePanel() {
  const { tables, members, mySeatInfo, pendingReflectionSessionId } = useRoomStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  if (!mySeatInfo) return null;

  const table = tables.find(t => t.tableIndex === mySeatInfo.tableIndex);
  if (!table) return null;

  const mySeat = table.seats.find(s => s.seatIndex === mySeatInfo.seatIndex);
  if (!mySeat) return null;

  const handleStandUp = () => {
    socket.emit('table:stand', (res) => {
      if (res && !res.ok) {
        alert(res.error || 'Failed to stand up');
      }
    });
  };

  const handleEndEarly = () => {
    socket.emit('session:end_early', (res) => {
      if (res && !res.ok) {
        alert(res.error || 'Failed to end session early');
      }
    });
  };

  const isFocusing = table.activeSession?.phase === 'focus' || table.activeSession?.phase === 'break';
  const isTableOwner = table.ownerId === user?.id;

  return (
    <div style={{ backgroundColor: colors.surface, borderRadius: '8px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Table {table.tableIndex + 1}</h3>
        {isTableOwner && <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: colors.primary, color: 'white', borderRadius: '4px' }}>Owner</span>}
      </div>

      {pendingReflectionSessionId && (
        <ReflectionForm sessionId={pendingReflectionSessionId} />
      )}

      {!pendingReflectionSessionId && (
        <>
          {table.activeSession ? (
            <div style={{ marginBottom: '15px' }}>
              <FocusTimer session={table.activeSession} />
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleEndEarly} style={{ width: '100%', padding: '8px', backgroundColor: colors.error, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>End Early</button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '15px' }}>
              <GoalForm />
              <ReadyButton table={table} mySeat={mySeat} isTableOwner={isTableOwner} />
            </div>
          )}

          <div style={{ marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '15px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Members</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {table.seats.filter(s => s.userId).map(s => {
                const member = members.find(m => m.userId === s.userId);
                const isReady = member?.sessionStatus === 'ready';
                return (
                  <div key={s.seatIndex} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>{member?.nickname || 'Unknown'}</span>
                    <span style={{ color: isReady ? colors.success : colors.textSecondary }}>
                      {isReady ? 'Ready' : (member?.sessionStatus || 'Waiting')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            onClick={handleStandUp} 
            disabled={isFocusing}
            style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: isFocusing ? '#ccc' : colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px', cursor: isFocusing ? 'not-allowed' : 'pointer' }}
          >
            Stand Up
          </button>
        </>
      )}
    </div>
  );
}