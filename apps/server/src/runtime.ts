import { randomUUID, randomBytes } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db, pool } from './db';
import { focusSessions, rooms } from './db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { AuthService } from './auth/service';
import { env } from './config';
import { WORLD, walkable, seatPoint } from '@connecta-focus/shared';
import type { Profile, Position, Cycle, Chat, Snapshot, SessionRecord, Action, Reply, GoalOutcome } from '@connecta-focus/shared';

interface Member { profile: Profile; position: Position; joined: number; seat: { table: number; index: number; at: number } | null; draft: { text: string; shared: boolean; ready: boolean } | null; disconnected: number | null; lastMove: number; outcome: GoalOutcome | null; ended: boolean }
interface Room { id: string; code: string; owner: string; members: Map<string, Member>; tables: { owner: string | null; cycle: Cycle | null }[]; banned: Set<string>; chat: Chat[]; emptySince: number | null }
interface Participation { sessionId: string; userId: string; roomCode: string; table: number | null; cycle: Cycle; goal: string; shared: boolean; ms: number; last: number | null; finished: boolean }
const plain = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
function text(value: unknown, max: number, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error('ข้อมูลไม่ถูกต้อง');
  return value.trim();
}

/** Serializes transitions for this single-instance demo, including asynchronous DB writes. */
export class Runtime {
  rooms = new Map<string, Room>();
  sockets = new Map<string, Socket>();
  participations = new Map<string, Participation>();
  private chain: Promise<unknown> = Promise.resolve();
  private lastChat = new Map<string, number>();
  private timer?: NodeJS.Timeout;
  constructor(public io: Server) {}
  run<T>(job: () => Promise<T>): Promise<T> {
    const result = this.chain.then(job);
    this.chain = result.catch(e => console.error('Transition failed:', e.message));
    return result;
  }
  async init() {
    // The demo does not restore ephemeral rooms after a server restart. Checkpointed time remains durable.
    await pool.query(`UPDATE focus_sessions SET status='ended', ended_at=now(), end_reason='server_restart' WHERE status='focusing';
      UPDATE rooms SET closed_at=now(), close_reason='server_restart' WHERE closed_at IS NULL;
      DELETE FROM chat_messages;`);
    this.io.use(async (socket, next) => {
      try {
        const payload = jwt.verify(socket.handshake.auth.token, env.JWT_SECRET) as { userId: string };
        socket.data.profile = await AuthService.getUser(payload.userId);
        next();
      } catch { next(new Error('กรุณาเข้าสู่ระบบใหม่')); }
    });
    this.io.on('connection', socket => {
      const user = socket.data.profile as Profile;
      void this.run(async () => {
        const old = this.sockets.get(user.id);
        this.sockets.set(user.id, socket);
        if (old && old !== socket) { old.emit('replaced'); old.disconnect(true); }
        const room = this.roomFor(user.id), member = room?.members.get(user.id);
        if (member && room) { member.disconnected = null; room.emptySince = null; }
        const p = this.participations.get(user.id);
        if (p && !p.finished) p.last = Date.now();
        await this.broadcast();
      });
      socket.on('action', (action: Action, data: any, callback: (r: Reply) => void) => {
        void this.run(async () => {
          try {
            if (this.sockets.get(user.id) !== socket || !socket.connected) throw new Error('แท็บนี้ไม่ได้ควบคุมแล้ว');
            await this.tick(false);
            const result = await this.action(user, action, data || {});
            await this.broadcast();
            if (typeof callback === 'function') callback({ ok: true, ...result });
          } catch (e) { if (typeof callback === 'function') callback({ ok: false, error: (e as Error).message }); }
        });
      });
      socket.on('move', (position: Position) => {
        if (this.sockets.get(user.id) !== socket) return;
        const room = this.roomFor(user.id), m = room?.members.get(user.id);
        if (!room || !m || m.seat || this.participations.get(user.id)?.finished === false) return;
        if (!position || !walkable(position.x, position.y) || !['up','down','left','right'].includes(position.direction)) return;
        const now = Date.now(), distance = Math.hypot(position.x - m.position.x, position.y - m.position.y);
        if (distance > WORLD.speed * Math.min(1, (now - m.lastMove) / 1000) + 18) return;
        // Reject traversal through solid objects even when the endpoint is on the other side.
        for (let t = 0; t <= 1; t += .1) if (!walkable(m.position.x + (position.x - m.position.x) * t, m.position.y + (position.y - m.position.y) * t)) return;
        m.position = { x: position.x, y: position.y, direction: position.direction, isMoving: !!position.isMoving }; m.lastMove = now;
        for (const id of room.members.keys()) this.sockets.get(id)?.emit('moved', { id: user.id, position: m.position });
      });
      socket.on('disconnect', () => {
        const at = Date.now();
        void this.run(async () => {
          if (this.sockets.get(user.id) !== socket) return;
          this.sockets.delete(user.id);
          const p = this.participations.get(user.id);
          if (p) { this.accrue(p, at); p.last = null; await this.checkpoint(p); }
          const room = this.roomFor(user.id), m = room?.members.get(user.id);
          if (room && m) {
            m.disconnected = at; m.position.isMoving = false;
            if (![...room.members.keys()].some(id => this.sockets.has(id))) room.emptySince = at;
          }
          await this.broadcast();
        });
      });
    });
    this.timer = setInterval(() => { void this.run(() => this.tick()).catch(console.error); }, 500);
  }
  roomFor(id: string) { return [...this.rooms.values()].find(r => r.members.has(id)); }
  member(room: Room, id: string) { const m = room.members.get(id); if (!m) throw new Error('ไม่ได้อยู่ในห้อง'); return m; }
  async pending(id: string) {
    return db.select().from(focusSessions).where(and(eq(focusSessions.userId,id),eq(focusSessions.status,'ended'),isNull(focusSessions.reflectionSubmittedAt))).orderBy(desc(focusSessions.createdAt));
  }
  accrue(p: Participation, at: number) {
    if (p.last !== null && !p.finished) p.ms += Math.max(0, Math.min(at, p.cycle.focusEnd) - p.last);
    if (p.last !== null) p.last = Math.min(at, p.cycle.focusEnd);
  }
  async checkpoint(p: Participation) {
    if (!p.finished) await db.update(focusSessions).set({ focusDurationMs: Math.round(p.ms) }).where(eq(focusSessions.id,p.sessionId));
  }
  async finish(p: Participation, reason: string, at = Date.now()) {
    if (p.finished) return;
    this.accrue(p, at);
    await db.update(focusSessions).set({ status:'ended', endedAt:new Date(at), endReason:reason, focusDurationMs:Math.round(p.ms) }).where(and(eq(focusSessions.id,p.sessionId),eq(focusSessions.status,'focusing')));
    p.finished = true; p.last = null;
    const m = this.rooms.get(p.roomCode)?.members.get(p.userId);
    if (m) { m.draft = null; m.ended = reason !== 'completed'; }
  }
  release(room: Room, id: string) {
    const m = room.members.get(id); if (!m?.seat) return;
    const index = m.seat.table;
    m.seat = null; m.draft = null; m.outcome = null;
    m.position = { ...WORLD.spawn, direction:'up', isMoving:false }; m.lastMove = Date.now();
    if (room.tables[index].owner === id) room.tables[index].owner = [...room.members.values()].filter(v => v.seat?.table === index).sort((a,b) => a.seat!.at - b.seat!.at)[0]?.profile.id || null;
  }
  async remove(room: Room, id: string, reason: string) {
    const p = this.participations.get(id);
    if (p) { await this.finish(p, reason); this.participations.delete(id); }
    this.release(room,id); room.members.delete(id);
    if (room.owner === id) room.owner = [...room.members.values()].filter(m => m.disconnected === null).sort((a,b) => a.joined-b.joined)[0]?.profile.id || [...room.members.keys()][0] || '';
    if (room.owner) await db.update(rooms).set({ ownerId:room.owner }).where(eq(rooms.id,room.id));
    if (![...room.members.keys()].some(uid => this.sockets.has(uid))) room.emptySince ??= Date.now();
    this.sockets.get(id)?.emit('notice', reason === 'kicked' ? 'เจ้าของห้องนำคุณออกแล้ว' : 'ออกจากห้องแล้ว');
  }
  async close(room: Room, reason: string) {
    for (const id of [...room.members.keys()]) await this.remove(room,id,'room_closed');
    await db.update(rooms).set({ closedAt:new Date(),closeReason:reason }).where(eq(rooms.id,room.id));
    room.chat = []; this.rooms.delete(room.code);
  }
  async begin(room: Room, ids: string[], table: number | null) {
    const now = Date.now(), cycle: Cycle = { id:randomUUID(), startedAt:now, focusEnd:now+env.FOCUS_MS, breakEnd:now+env.FOCUS_MS+env.BREAK_MS };
    for (const id of ids) {
      if (this.participations.has(id)) throw new Error('คุณยังมีรอบที่กำลังดำเนินอยู่');
      if ((await this.pending(id)).length) throw new Error('บันทึกผลรอบเดิมก่อนเริ่มรอบใหม่');
    }
    const records = await db.transaction(async tx => {
      const result = [];
      for (const id of ids) {
        const m = this.member(room,id), draft = m.draft!;
        const [row] = await tx.insert(focusSessions).values({ userId:id, roomId:room.id, tableIndex:table, goalText:draft.text, goalShared:draft.shared, status:'focusing', startedAt:new Date(now) }).returning();
        result.push(row);
      }
      return result;
    });
    for (const row of records) {
      this.participations.set(row.userId,{ sessionId:row.id,userId:row.userId, roomCode:room.code,table,cycle,goal:row.goalText,shared:row.goalShared,ms:0,last:now,finished:false });
      this.member(room,row.userId).ended = false;
    }
    if (table !== null) room.tables[table].cycle = cycle;
  }
  async reflect(userId: string, data: any) {
    const id = text(data.sessionId, 40);
    if (!['achieved','partial','not_achieved'].includes(data.goalOutcome)) throw new Error('เลือกผลเป้าหมาย');
    const [record] = await db.select().from(focusSessions).where(and(eq(focusSessions.id,id),eq(focusSessions.userId,userId)));
    if (!record || record.status !== 'ended') throw new Error('ไม่พบรอบที่จบแล้วของคุณ');
    await db.update(focusSessions).set({ goalOutcome:data.goalOutcome, reflectionObstacles:text(data.obstacles ?? '',2000,false),reflectionNextSteps:text(data.nextSteps ?? '',2000,false),reflectionSubmittedAt:new Date() }).where(eq(focusSessions.id,id));
    const p = this.participations.get(userId), m = this.roomFor(userId)?.members.get(userId);
    if (m && p?.sessionId === id) m.outcome = data.goalOutcome;
  }
  async action(user: Profile, action: Action, data: any): Promise<Partial<Reply>> {
    const id = user.id;
    if (action === 'sync') return {};
    if (action === 'session:reflect') { await this.reflect(id,data); return {}; }
    if (action === 'room:create') {
      if (this.roomFor(id)) throw new Error('ออกจากห้องปัจจุบันก่อน');
      const code = randomBytes(3).toString('hex').toUpperCase();
      const [record] = await db.insert(rooms).values({ code, ownerId:id }).returning();
      this.rooms.set(code,{ id:record.id,code,owner:id,members:new Map(),tables:[{owner:null,cycle:null},{owner:null,cycle:null}],banned:new Set(),chat:[],emptySince:Date.now() });
      await this.action(user,'room:join',{code}); return {code};
    }
    if (action === 'room:join') {
      const code = text(data.code,6).toUpperCase(), room = this.rooms.get(code);
      if (!room) throw new Error('ไม่พบห้อง หรือห้องปิดแล้ว');
      if (room.banned.has(id)) throw new Error('คุณถูกนำออกจากห้องนี้');
      if (this.roomFor(id)?.code === code) return {code};
      if (this.roomFor(id)) throw new Error('ออกจากห้องปัจจุบันก่อน');
      if (room.members.size >= 8) throw new Error('ห้องเต็มแล้ว');
      room.members.set(id,{ profile:user,position:{...WORLD.spawn,direction:'up',isMoving:false},joined:Date.now(),seat:null,draft:null,disconnected:null,lastMove:Date.now(),outcome:null,ended:false });
      if (!room.owner) room.owner=id;
      room.emptySince=null; return {code};
    }
    const room = this.roomFor(id); if (!room) throw new Error('เข้าห้องก่อน');
    const m = this.member(room,id), p = this.participations.get(id);
    switch (action) {
      case 'room:leave': await this.remove(room,id,'left_room'); break;
      case 'room:close': if (room.owner !== id) throw new Error('เฉพาะเจ้าของห้อง'); await this.close(room,'owner_closed'); break;
      case 'room:kick': {
        if (room.owner !== id || data.userId === id || !room.members.has(data.userId)) throw new Error('นำสมาชิกนี้ออกไม่ได้');
        room.banned.add(data.userId); await this.remove(room,data.userId,'kicked'); break;
      }
      case 'table:sit': {
        const t=data.table, s=data.seat;
        if (!Number.isInteger(t)||!Number.isInteger(s)||t<0||t>1||s<0||s>3) throw new Error('ที่นั่งไม่ถูกต้อง');
        if (m.seat) throw new Error('คุณนั่งอยู่แล้ว');
        if (p && !p.finished) throw new Error('จบรอบเดิมก่อนเปลี่ยนที่นั่ง');
        if ([...room.members.values()].some(v=>v.seat?.table===t && v.seat?.index===s)) throw new Error('ที่นั่งนี้มีคนแล้ว');
        m.seat={table:t,index:s,at:Date.now()}; m.position={...seatPoint(t,s),isMoving:false}; m.ended=false; m.outcome=null;
        room.tables[t].owner ??= id; break;
      }
      case 'table:stand': if (p && !p.finished) throw new Error('กดยุติรอบและลุกก่อน'); this.release(room,id); break;
      case 'session:goal': {
        if (p) throw new Error('รอรอบปัจจุบันสิ้นสุดก่อน');
        m.draft={text:text(data.text,500),shared:data.shared===true,ready:false}; break;
      }
      case 'session:ready': {
        if (!m.seat || !m.draft || p || room.tables[m.seat.table].cycle) throw new Error('ตั้งเป้าหมายและรอให้โต๊ะว่างก่อน');
        if ((await this.pending(id)).length) throw new Error('บันทึกผลรอบเดิมก่อนกดพร้อม');
        m.draft.ready=!m.draft.ready; break;
      }
      case 'session:start': {
        const t=m.seat?.table;
        if (t === undefined || room.tables[t].owner !== id) throw new Error('เฉพาะเจ้าของโต๊ะ');
        if (room.tables[t].cycle) throw new Error('โต๊ะมีรอบอยู่แล้ว');
        const members=[...room.members.values()].filter(v=>v.seat?.table===t);
        if (!members.length || members.some(v=>!v.draft?.ready || v.disconnected !== null)) throw new Error('สมาชิกทุกคนต้องพร้อมและออนไลน์');
        await this.begin(room,members.map(v=>v.profile.id),t); break;
      }
      case 'session:solo': if (m.seat || !m.draft) throw new Error('ลุกจากโต๊ะและตั้งเป้าหมายก่อน'); await this.begin(room,[id],null); break;
      case 'session:end': if (!p || p.finished) throw new Error('ไม่มีรอบที่กำลังโฟกัส'); await this.finish(p,'ended_early'); this.participations.delete(id); this.release(room,id); break;
      case 'chat:send': {
        if (Date.now()-(this.lastChat.get(id)||0)<400) throw new Error('ส่งข้อความเร็วเกินไป');
        const message={id:randomUUID(),userId:id,nickname:user.nickname,text:text(data.text,200),at:Date.now()};
        this.lastChat.set(id,Date.now()); room.chat.push(message); room.chat=room.chat.slice(-100);
        for (const uid of room.members.keys()) this.sockets.get(uid)?.emit('chat',message); break;
      }
      default: throw new Error('คำสั่งไม่ถูกต้อง');
    }
    return {};
  }
  async tick(broadcast=true) {
    const now=Date.now();
    for (const [id,p] of this.participations) {
      if (!p.finished) {
        this.accrue(p,now);
        if (now>=p.cycle.focusEnd) await this.finish(p,'completed',p.cycle.focusEnd);
        else await this.checkpoint(p);
      }
      if (now>=p.cycle.breakEnd) this.participations.delete(id);
    }
    for (const room of this.rooms.values()) {
      for (const [id,m] of room.members) {
        if (m.disconnected !== null && now-m.disconnected>=env.SEAT_MS) {
          this.release(room,id);
          if (room.owner===id) room.owner=[...room.members.values()].filter(v=>v.disconnected===null).sort((a,b)=>a.joined-b.joined)[0]?.profile.id || id;
        }
      }
      for (const t of room.tables) if (t.cycle && now>=t.cycle.breakEnd) t.cycle=null;
      if (room.emptySince !== null && now-room.emptySince>=env.EMPTY_MS) await this.close(room,'empty_timeout');
    }
    if (broadcast) await this.broadcast();
  }
  async snapshot(id: string): Promise<Snapshot> {
    const room=this.roomFor(id), me=room?.members.get(id), p=this.participations.get(id), now=Date.now();
    return { now,room:room?{id:room.id,code:room.code,owner:room.owner,chat:room.chat,tables:room.tables.map((t,index)=>({index,owner:t.owner,cycle:t.cycle,seats:Array.from({length:4},(_,s)=>[...room.members.values()].find(v=>v.seat?.table===index&&v.seat.index===s)?.profile.id||null)})),members:[...room.members.values()].map(m=>{
      const active=this.participations.get(m.profile.id);
      const sameTable=!!m.seat&&!!me?.seat&&m.seat.table===me.seat.table;
      const self=m.profile.id===id;
      const shared=active?.shared ?? m.draft?.shared;
      return {id:m.profile.id,nickname:m.profile.nickname,avatar:m.profile.avatarPreset,position:m.position,connected:m.disconnected===null,seat:m.seat?{table:m.seat.table,index:m.seat.index}:null,status:active?(active.finished?'break':'focusing'):(m.draft?.ready?'ready':m.ended?'ended':'waiting'),...(self||sameTable?{outcome:m.outcome}:{}),...((self||sameTable&&shared)?{goal:active?.goal??m.draft?.text}: {})};
    })}:null,personal:{active:p?{...p.cycle,sessionId:p.sessionId,goal:p.goal,table:p.table,roomCode:p.roomCode}:null,draft:me?.draft||null,pending:plain<SessionRecord[]>(await this.pending(id))} };
  }
  async broadcast() {
    for (const [id,socket] of this.sockets) if (socket.connected) socket.emit('snapshot',await this.snapshot(id));
  }
  async stop() { if (this.timer) clearInterval(this.timer); await this.chain; }
}
