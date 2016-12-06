"use strict";

let DrawTypes = require('drawtypes');
let Color = require('color');

let uid = 0;
function getUID() {
  return uid++;
}

class Palette {
  constructor(source, randomize) {
    if (source.constructor == Palette) {
      this.setParams(source.params);
      this.drawType = source.drawType;
    } else {
      // params object
      this.setParams(source);
      this.drawType = DrawTypes.LINES;
    }

    if (randomize) {
      for (let name in this.params) {
        let param = this.params[name];
        let delta = param.max - param.min;
        param.default = Math.random() * delta + param.min;
      }
      
      this.drawType = DrawTypes.chooseRandom();
    }

    this.uid = getUID();
  }

  get drawType() {
    return this._drawType;
  }
  
  set drawType(drawType) {
    DrawTypes.checkDrawType(drawType);
    this._drawType = drawType;
  }

  setParams(params) {
    this.params = JSON.parse(JSON.stringify(params)); // deep copy params
  }

  getParam(name) {
    return this.params[name];
  }
  
  getValue(name) {
    var param = this.getParam(name);
    return param.hasOwnProperty('value') ? param.value : param.default;
  }

  getCurrentColor() {
    // this.setPaletteValue('colorHue', Math.random() * 360);
    let s = this.getValue('saturation');
    let hsv = Color.createHSV( {
      h: this.getValue('colorHue'),
      s: s
    } );
    return Color.hsvToRgb(hsv);
  }

}

module.exports = Palette;
