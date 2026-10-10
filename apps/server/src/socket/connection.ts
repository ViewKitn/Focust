import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { registerRoomHandlers } from '../rooms/handlers';
import { registerTableHandlers } from '../tables/handlers';
import { registerSessionHandlers } from '../sessions/handlers';
import { registerChatHandlers } from '../chat/handlers';

export function handleConnection(
  io: Server<ClientToServerEvents, ServerToClientEvents>, 
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  registerRoomHandlers(io, socket);
  registerTableHandlers(io, socket);
  registerSessionHandlers(io, socket);
  registerChatHandlers(socket);
}
