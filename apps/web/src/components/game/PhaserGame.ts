import Phaser from 'phaser';
import Preloader from './scenes/Preloader';
import RoomScene from './scenes/RoomScene';
import { colors } from '../../styles/theme';

export function createPhaserGame(parent: HTMLElement) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS, // Use CANVAS for better performance with simple graphics
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: colors.background,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0, x: 0 }
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, RoomScene]
  };

  return new Phaser.Game(config);
}