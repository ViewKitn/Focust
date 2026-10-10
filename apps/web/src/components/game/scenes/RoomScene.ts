import Phaser from 'phaser';
import Player from '../entities/Player';
import OtherPlayer from '../entities/OtherPlayer';
import StudyTable from '../entities/StudyTable';
import GoalBoard from '../entities/GoalBoard';
import SummaryBoard from '../entities/SummaryBoard';
import { isTypingRef } from '../../../hooks/useKeyboard';
import type { TypedSocket } from '../../../socket/client';

export default class RoomScene extends Phaser.Scene {
  socket!: TypedSocket;
  roomStore!: any;
  player!: Player;
  otherPlayers: Map<string, OtherPlayer> = new Map();
  walls!: Phaser.Physics.Arcade.StaticGroup;
  tables: StudyTable[] = [];
  interactables: any[] = [];
  lastMoveEmit = 0;

  constructor() {
    super('RoomScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.roomStore = this.registry.get('roomStore');

    // Create room boundaries (25x19 tiles = 800x608)
    const mapWidth = 800;
    const mapHeight = 608;

    // Floor
    this.add.tileSprite(mapWidth/2, mapHeight/2, mapWidth, mapHeight, 'floor');

    // Walls
    this.walls = this.physics.add.staticGroup();
    for (let x = 0; x < mapWidth; x += 32) {
      this.walls.create(x + 16, 16, 'wall'); // Top
      this.walls.create(x + 16, mapHeight - 16, 'wall'); // Bottom
    }
    for (let y = 0; y < mapHeight; y += 32) {
      this.walls.create(16, y + 16, 'wall'); // Left
      this.walls.create(mapWidth - 16, y + 16, 'wall'); // Right
    }

    // Tables
    const table1 = new StudyTable(this, 250, 250, 0);
    const table2 = new StudyTable(this, 550, 250, 1);
    this.tables = [table1, table2];
    this.interactables.push(table1, table2);
    
    // Boards
    const goalBoard = new GoalBoard(this, mapWidth/2, 48);
    const summaryBoard = new SummaryBoard(this, 100, 48);
    this.interactables.push(goalBoard, summaryBoard);

    // Initial state from store
    const state = this.roomStore.getState();
    const myId = useAuthStore.getState().user?.id; // Note: Need to pass auth store or id

    // Setup local player spawn point
    this.player = new Player(this, mapWidth/2, mapHeight - 64, 'preset-1');
    this.physics.add.collider(this.player, this.walls);
    this.tables.forEach(t => this.physics.add.collider(this.player, t));

    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

    // Initial players
    state.members.forEach((m: any) => {
      if (m.userId !== myId) {
        this.addOtherPlayer(m);
      }
    });

    // Listen to store changes for remote players
    this.roomStore.subscribe((newState: any, oldState: any) => {
      if (newState.members !== oldState.members) {
        this.syncMembers(newState.members, myId || '');
      }
    });
  }

  addOtherPlayer(member: any) {
    const p = new OtherPlayer(this, member.position?.x || 0, member.position?.y || 0, member.avatarPreset, member.nickname);
    this.otherPlayers.set(member.userId, p);
  }

  syncMembers(members: any[], myId: string) {
    const currentIds = new Set(members.map(m => m.userId));
    
    // Remove left players
    for (const [id, player] of this.otherPlayers.entries()) {
      if (!currentIds.has(id)) {
        player.destroy();
        this.otherPlayers.delete(id);
      }
    }

    // Update or add players
    members.forEach(m => {
      if (m.userId === myId) {
        // Sync local player state if needed (like seat status)
      } else {
        let op = this.otherPlayers.get(m.userId);
        if (!op) {
          this.addOtherPlayer(m);
          op = this.otherPlayers.get(m.userId);
        }
        if (op) {
          op.targetX = m.position?.x || op.x;
          op.targetY = m.position?.y || op.y;
          op.targetDirection = m.position?.direction || 'down';
        }
      }
    });
  }

  update(time: number, delta: number) {
    if (!isTypingRef) {
      this.player.update();
    } else {
      this.player.body.setVelocity(0, 0);
    }

    this.otherPlayers.forEach(p => p.update());

    // Emit movement
    if (time > this.lastMoveEmit + 100) {
      if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
        this.socket.emit('player:move', {
          x: this.player.x,
          y: this.player.y,
          direction: this.player.direction,
          isMoving: true
        });
        this.lastMoveEmit = time;
      }
    }

    // Interaction checks
    if (!isTypingRef && Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('E'))) {
      const interactable = this.getClosestInteractable();
      if (interactable && typeof interactable.interact === 'function') {
        interactable.interact();
      }
    }
  }

  getClosestInteractable(): any {
    let closest: any = null;
    let minDistance = 64;

    this.interactables.forEach(obj => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = obj;
      }
    });
    return closest;
  }
}
// Import fix
import useAuthStore from '../../../stores/authStore';