import Phaser from 'phaser';

const presetColors: Record<string, number> = {
  'preset-1': 0xFFB3BA,
  'preset-2': 0xFFDFBA,
  'preset-3': 0xFFFFBA,
  'preset-4': 0xBAFFC9
};

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Generate placeholder textures using graphics
    const graphics = this.make.graphics();
    
    // Avatars
    Object.keys(presetColors).forEach(preset => {
      graphics.clear();
      graphics.fillStyle(presetColors[preset]);
      graphics.fillCircle(16, 16, 16);
      graphics.lineStyle(2, 0x000000, 0.2);
      graphics.strokeCircle(16, 16, 16);
      graphics.generateTexture(preset, 32, 32);
    });

    // Walls
    graphics.clear();
    graphics.fillStyle(0xE5DDD3);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('wall', 32, 32);

    // Floor
    graphics.clear();
    graphics.fillStyle(0xFAF7F2);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('floor', 32, 32);

    // Table
    graphics.clear();
    graphics.fillStyle(0x8B7355);
    graphics.fillRect(0, 0, 128, 96);
    graphics.generateTexture('table', 128, 96);

    // Chair
    graphics.clear();
    graphics.fillStyle(0x5B7F5E);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('chair', 32, 32);

    // Goal Board
    graphics.clear();
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(0, 0, 64, 32);
    graphics.generateTexture('goal_board', 64, 32);

    // Summary Board
    graphics.clear();
    graphics.fillStyle(0x4CAF50);
    graphics.fillRect(0, 0, 64, 32);
    graphics.generateTexture('summary_board', 64, 32);
    
    graphics.destroy();
  }

  create() {
    this.scene.start('RoomScene');
  }
}