import React, { useEffect, useState } from 'react';
import { getHistory } from '../../api/sessions';
import SummaryStats from './SummaryStats';
import SessionCard from './SessionCard';
import { colors } from '../../styles/theme';
import Header from '../layout/Header';

export default function HistoryPage() {
  const [range, setRange] = useState<'today' | 'week'>('today');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [range]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory(range);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header />
      <div className="container" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Focus History</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setRange('today')} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${colors.primary}`, backgroundColor: range === 'today' ? colors.primary : 'transparent', color: range === 'today' ? 'white' : colors.primary, cursor: 'pointer' }}>Today</button>
            <button onClick={() => setRange('week')} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${colors.primary}`, backgroundColor: range === 'week' ? colors.primary : 'transparent', color: range === 'week' ? 'white' : colors.primary, cursor: 'pointer' }}>Past 7 Days</button>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {data && <SummaryStats stats={data.stats} />}
            <h3 style={{ margin: '30px 0 15px' }}>Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {data?.sessions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: colors.surface, borderRadius: '8px', color: colors.textSecondary }}>No sessions found for this period.</div>
              ) : (
                data?.sessions.map((session: any) => (
                  <SessionCard key={session.id} session={session} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}