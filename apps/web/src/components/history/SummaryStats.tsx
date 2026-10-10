import React from 'react';
import { colors } from '../../styles/theme';
import { formatDuration } from '../../utils/format';

export default function SummaryStats({ stats }: { stats: any }) {
  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
      <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '5px' }}>Total Focus Time</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary }}>{formatDuration(stats.totalFocusTimeMs)}</div>
      </div>
      
      <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '5px' }}>Completed Sessions</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.completedSessions}</div>
      </div>

      <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '5px' }}>Goals Achieved</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.success }}>{stats.goalsAchieved}</div>
      </div>
      
      <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '5px' }}>Pending Reflections</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: stats.pendingReflections > 0 ? colors.error : colors.text }}>{stats.pendingReflections}</div>
      </div>
    </div>
  );
}