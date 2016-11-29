"use strict";

let DrawTypes = require('drawtypes');

let uid = 0;
function getUID() {
  return uid++;
}

class Palette {
  constructor(params, randomize) {
    this.setParams(params);

    this.drawType = DrawTypes.LINES;

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

}

module.exports = Palette;
