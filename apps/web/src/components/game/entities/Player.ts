import Phaser from 'phaser';
import type { Direction } from '@connecta-focus/shared';

export default class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  avatar: Phaser.GameObjects.Sprite;
  direction: Direction = 'down';
  keys: any;

  constructor(scene: Phaser.Scene, x: number, y: number, preset: string) {
    super(scene, x, y);
    
    this.avatar = scene.add.sprite(0, 0, preset);
    this.add(this.avatar);
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.body.setSize(24, 24);
    this.body.setOffset(-12, -12);
    this.body.collideWorldBounds = true;

    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  update() {
    const speed = 150;
    this.body.setVelocity(0);

    if (this.keys.LEFT.isDown || this.keys.A.isDown) {
      this.body.setVelocityX(-speed);
      this.direction = 'left';
    } else if (this.keys.RIGHT.isDown || this.keys.D.isDown) {
      this.body.setVelocityX(speed);
      this.direction = 'right';
    }

    if (this.keys.UP.isDown || this.keys.W.isDown) {
      this.body.setVelocityY(-speed);
      this.direction = 'up';
    } else if (this.keys.DOWN.isDown || this.keys.S.isDown) {
      this.body.setVelocityY(speed);
      this.direction = 'down';
    }
  }
}