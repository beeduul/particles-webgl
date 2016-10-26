"use strict";

class Palette {
  constructor(params) {
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
