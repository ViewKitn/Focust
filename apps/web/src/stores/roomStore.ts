import { create } from 'zustand';
import type { RoomState, RoomMember, TableState, SessionStatus, PlayerPosition } from '@connecta-focus/shared';

interface RoomStoreState {
  roomId: string | null;
  roomCode: string | null;
  ownerId: string | null;
  members: RoomMember[];
  tables: TableState[];
  
  mySeatInfo: { tableIndex: number; seatIndex: number } | null;
  mySessionStatus: SessionStatus | null;
  myActiveSession: { sessionId: string; goalText: string; goalShared: boolean } | null;
  pendingReflectionSessionId: string | null;
  
  setRoomState: (state: RoomState) => void;
  updateMember: (member: RoomMember) => void;
  removeMember: (userId: string) => void;
  updateMemberPosition: (userId: string, position: PlayerPosition) => void;
  updateMemberSeat: (userId: string, tableIndex: number, seatIndex: number) => void;
  updateMemberStood: (userId: string) => void;
  updateTableState: (tableIndex: number, table: TableState) => void;
  setMySessionStatus: (status: SessionStatus | null) => void;
  clearRoom: () => void;
}

const useRoomStore = create<RoomStoreState>((set) => ({
  roomId: null,
  roomCode: null,
  ownerId: null,
  members: [],
  tables: [],
  
  mySeatInfo: null,
  mySessionStatus: null,
  myActiveSession: null,
  pendingReflectionSessionId: null,

  setRoomState: (state) => set({
    roomId: state.roomId,
    roomCode: state.roomCode,
    ownerId: state.ownerId,
    members: state.members,
    tables: state.tables,
  }),
  updateMember: (member) => set((state) => ({
    members: [...state.members.filter(m => m.userId !== member.userId), member]
  })),
  removeMember: (userId) => set((state) => ({
    members: state.members.filter(m => m.userId !== userId)
  })),
  updateMemberPosition: (userId, position) => set((state) => ({
    members: state.members.map(m => m.userId === userId ? { ...m, position } : m)
  })),
  updateMemberSeat: (userId, tableIndex, seatIndex) => set((state) => ({
    members: state.members.map(m => m.userId === userId ? { ...m, seatInfo: { tableIndex, seatIndex } } : m)
  })),
  updateMemberStood: (userId) => set((state) => ({
    members: state.members.map(m => m.userId === userId ? { ...m, seatInfo: null, sessionStatus: null } : m)
  })),
  updateTableState: (tableIndex, table) => set((state) => {
    const newTables = [...state.tables];
    const index = newTables.findIndex(t => t.tableIndex === tableIndex);
    if (index >= 0) {
      newTables[index] = table;
    } else {
      newTables.push(table);
    }
    return { tables: newTables };
  }),
  setMySessionStatus: (status) => set({ mySessionStatus: status }),
  clearRoom: () => set({
    roomId: null,
    roomCode: null,
    ownerId: null,
    members: [],
    tables: [],
    mySeatInfo: null,
    mySessionStatus: null,
    myActiveSession: null,
    pendingReflectionSessionId: null,
  })
}));

export default useRoomStore;