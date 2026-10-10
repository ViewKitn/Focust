import React from 'react';
import { colors } from '../../styles/theme';
import { formatRelativeTime, formatDuration } from '../../utils/format';

export default function SessionCard({ session }: { session: any }) {
  const getOutcomeBadge = () => {
    if (!session.reflection) return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: colors.error, color: 'white' }}>Pending Reflection</span>;
    switch (session.reflection.outcome) {
      case 'achieved': return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: colors.success, color: 'white' }}>Achieved ✓</span>;
      case 'partial': return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#FFC107', color: 'black' }}>Partial ~</span>;
      case 'not_achieved': return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: colors.error, color: 'white' }}>Not Achieved ✗</span>;
      default: return null;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: colors.textSecondary }}>{new Date(session.startTime).toLocaleString()} ({formatRelativeTime(session.startTime)})</div>
        <div>{getOutcomeBadge()}</div>
      </div>
      
      <div style={{ fontSize: '18px', fontWeight: '500' }}>{session.goalText}</div>
      
      <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: colors.textSecondary, marginTop: '10px' }}>
        <div>⏱️ Duration: {formatDuration(session.durationMs)}</div>
        <div>🏁 End Reason: {session.endReason}</div>
      </div>

      {session.reflection && (session.reflection.obstacles || session.reflection.nextSteps) && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: colors.background, borderRadius: '4px', fontSize: '14px' }}>
          {session.reflection.obstacles && <div style={{ marginBottom: '5px' }}><strong>อุปสรรค:</strong> {session.reflection.obstacles}</div>}
          {session.reflection.nextSteps && <div><strong>สิ่งที่ทำต่อ:</strong> {session.reflection.nextSteps}</div>}
        </div>
      )}
    </div>
  );
}