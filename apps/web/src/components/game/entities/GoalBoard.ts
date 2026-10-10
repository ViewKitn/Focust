import Phaser from 'phaser';
import InteractiveObject from './InteractiveObject';

export default class GoalBoard extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const sprite = scene.add.sprite(0, 0, 'goal_board');
    this.add(sprite);
    this.body.setSize(64, 32);
  }

  interact() {
    alert('This is the Goal Board. Sit at a table to set a goal!');
  }
}