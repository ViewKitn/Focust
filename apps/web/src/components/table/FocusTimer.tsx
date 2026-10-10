import React, { useEffect, useState } from 'react';
import { formatTime } from '../../utils/format';
import { colors } from '../../styles/theme';
import type { TableState } from '@connecta-focus/shared';

export default function FocusTimer({ session }: { session: NonNullable<TableState['activeSession']> }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const end = new Date(session.endsAt).getTime();
      setTimeLeft(Math.max(0, end - now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session.endsAt]);

  const isFocusing = session.phase === 'focus';
  const bgColor = isFocusing ? colors.focusActive : colors.breakActive;

  return (
    <div style={{ padding: '20px', backgroundColor: bgColor, borderRadius: '8px', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isFocusing ? colors.primary : colors.secondary }}>
        {isFocusing ? 'Focusing' : 'Break Time'}
      </h3>
      <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'monospace' }}>
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}