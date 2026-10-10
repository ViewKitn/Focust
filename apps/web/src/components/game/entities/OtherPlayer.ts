import Phaser from 'phaser';

export default class OtherPlayer extends Phaser.GameObjects.Container {
  avatar: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  
  targetX: number;
  targetY: number;
  targetDirection: string = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, preset: string, nickname: string) {
    super(scene, x, y);
    
    this.targetX = x;
    this.targetY = y;

    this.avatar = scene.add.sprite(0, 0, preset);
    
    this.nameText = scene.add.text(0, -25, nickname, {
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    this.add([this.avatar, this.nameText]);
    scene.add.existing(this);
  }

  update() {
    // Interpolate position
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.2);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.2);
  }
}