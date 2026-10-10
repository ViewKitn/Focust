import Phaser from 'phaser';

export default class InteractiveObject extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }

  interact() {
    // Override in subclasses
  }
}