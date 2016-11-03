"use strict";

const RANDOMIZE = false;

class Palette {
  constructor(params) {
    this.params = JSON.parse(JSON.stringify(params)); // deep copy params
    
    if (RANDOMIZE) {
      for (let name in this.params) {
        let param = this.params[name];
        let delta = param.max - param.min;
        param.default = Math.random() * delta + param.min;
      }
    }
    
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
