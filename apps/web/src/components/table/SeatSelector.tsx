import React from 'react';
import useRoomStore from '../../stores/roomStore';
import { getSocket } from '../../socket/client';
import { colors } from '../../styles/theme';

export default function SeatSelector({ tableIndex, onClose }: { tableIndex: number, onClose: () => void }) {
  const { tables, members } = useRoomStore();
  const socket = getSocket();
  const table = tables.find(t => t.tableIndex === tableIndex);

  if (!table) return null;

  const handleSit = (seatIndex: number) => {
    socket.emit('table:sit', { tableIndex, seatIndex }, (res) => {
      if (res && !res.ok && res.error) {
        alert(res.error);
      }
    });
    onClose();
  };

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.surface, padding: '20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100, pointerEvents: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Table {tableIndex + 1} - Select a Seat</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '20px 0' }}>
        {table.seats.map(seat => {
          const occupant = members.find(m => m.userId === seat.userId);
          return (
            <button
              key={seat.seatIndex}
              onClick={() => handleSit(seat.seatIndex)}
              disabled={!!seat.userId}
              style={{
                padding: '20px', borderRadius: '8px',
                border: `2px solid ${seat.userId ? colors.border : colors.primary}`,
                backgroundColor: seat.userId ? colors.background : 'transparent',
                cursor: seat.userId ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>Seat {seat.seatIndex + 1}</div>
              <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '5px' }}>
                {seat.userId ? `Occupied by ${occupant?.nickname || 'Occupied'}` : 'Available'}
              </div>
            </button>
          );
        })}
      </div>
      
      <button onClick={onClose} style={{ width: '100%', padding: '10px', backgroundColor: colors.border, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
    </div>
  );
}