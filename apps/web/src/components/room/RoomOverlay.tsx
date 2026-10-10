import React from 'react';
import useRoomStore from '../../stores/roomStore';
import useAuthStore from '../../stores/authStore';
import TablePanel from '../table/TablePanel';
import ChatBubble from '../chat/ChatBubble';
import ChatPanel from '../chat/ChatPanel';
import { colors } from '../../styles/theme';

export default function RoomOverlay() {
  const { roomCode, members, ownerId, mySeatInfo } = useRoomStore();
  const { user } = useAuthStore();

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      {/* Top Bar */}
      <div style={{ padding: '10px 20px', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
        <div>
          <strong>Room Code: </strong> {roomCode}
        </div>
        <div>
          Members: {members.length}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {mySeatInfo && (
          <div style={{ position: 'absolute', right: '20px', top: '20px', pointerEvents: 'auto', width: '350px' }}>
            <TablePanel />
          </div>
        )}
      </div>

      <ChatBubble />
      <ChatPanel />
    </div>
  );
}