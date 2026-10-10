import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserGame } from './PhaserGame';
import useRoomStore from '../../stores/roomStore';
import { getSocket } from '../../socket/client';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (gameRef.current) return;

    gameRef.current = createPhaserGame(containerRef.current);
    
    // Pass dependencies to game registry
    gameRef.current.registry.set('socket', getSocket());
    gameRef.current.registry.set('roomStore', useRoomStore);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}