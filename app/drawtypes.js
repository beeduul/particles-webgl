"use strict";

// let Enum = require('es6-enum');

class DrawTypes {
  static get LINES() { return 'LINES' };
  static get TRI_STROKED() { return 'TRI_STROKED' };
  static get SQUARE_STROKED() { return 'SQUARE_STROKED' };
  static get CIRCLE_SHADED() { return 'CIRCLE_SHADED' };
  
  static checkDrawType(drawType) {
    if (this[drawType] === undefined) {
      throw `Invalid Draw Type ${drawType}`;
    }
  }
}

module.exports = DrawTypes; // Enum('CIRCLE_SHADED', 'LINES', 'TRI_STROKED', 'SQUARE_STROKED');
