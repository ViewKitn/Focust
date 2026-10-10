import { useEffect, useState } from 'react';
import { useKeyboard } from './useKeyboard';
import useRoomStore from '../stores/roomStore';
import { getSocket } from '../socket/client';

export function useInteraction() {
  const { keys, isTypingRef } = useKeyboard();
  const socket = getSocket();
  const [nearbyObject, setNearbyObject] = useState<{ type: string, id: string } | null>(null);

  // In a real app, this logic would live in Phaser and emit an event to React
  // Or React would poll Phaser.
  // For simplicity, we assume Phaser manages the interaction prompt UI.

  return { nearbyObject };
}