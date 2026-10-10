import Phaser from 'phaser';
import InteractiveObject from './InteractiveObject';

export default class SummaryBoard extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const sprite = scene.add.sprite(0, 0, 'summary_board');
    this.add(sprite);
    this.body.setSize(64, 32);
  }

  interact() {
    window.location.href = '/history';
  }
}