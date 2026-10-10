import Phaser from 'phaser';
import InteractiveObject from './InteractiveObject';
import { createRoot } from 'react-dom/client';
import React from 'react';
import SeatSelector from '../../table/SeatSelector';

export default class StudyTable extends InteractiveObject {
  tableIndex: number;
  chairs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, tableIndex: number) {
    super(scene, x, y);
    this.tableIndex = tableIndex;

    const tableSprite = scene.add.sprite(0, 0, 'table');
    this.add(tableSprite);
    this.body.setSize(128, 96);
    
    // Add 4 chairs around it
    this.chairs.push(scene.add.sprite(-30, -60, 'chair')); // Top left
    this.chairs.push(scene.add.sprite(30, -60, 'chair'));  // Top right
    this.chairs.push(scene.add.sprite(-30, 60, 'chair'));  // Bottom left
    this.chairs.push(scene.add.sprite(30, 60, 'chair'));   // Bottom right
    
    this.chairs.forEach(c => this.add(c));
  }

  interact() {
    // In a real implementation we would render this via a React portal
    // or trigger state that opens the UI in React.
    // For simplicity we create a temporary root to mount it.
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    
    root.render(
      React.createElement(SeatSelector, {
        tableIndex: this.tableIndex,
        onClose: () => {
          setTimeout(() => {
            root.unmount();
            div.remove();
          }, 0);
        }
      })
    );
  }
}