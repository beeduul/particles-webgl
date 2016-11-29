"use strict";

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

class DrawTypes {
  
  static get LINES() { return 'LINES' };
  static get TRI_STROKED() { return 'TRI_STROKED' };
  static get SQUARE_STROKED() { return 'SQUARE_STROKED' };
  static get CIRCLE_SHADED() { return 'CIRCLE_SHADED' };
  
  static get all() {
    return [DrawTypes.LINES, DrawTypes.TRI_STROKED, DrawTypes.SQUARE_STROKED, DrawTypes.CIRCLE_SHADED];
  }
  
  static chooseRandom() {
    return this.all[getRandomInt(0, this.all.length)];
  }
  
  static checkDrawType(drawType) {
    if (this[drawType] === undefined) {
      throw `Invalid Draw Type ${drawType}`;
    }
  }
}

module.exports = DrawTypes; // Enum('CIRCLE_SHADED', 'LINES', 'TRI_STROKED', 'SQUARE_STROKED');
