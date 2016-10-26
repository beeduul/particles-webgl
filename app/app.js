"use strict";

var Graphics = require('graphics');

var FPSLimit = 30;

var App = {
  
  last_time: undefined,
  start_time: undefined,
  
  isInitialized: function() {
    return this.start_time != undefined;
  },

  init: function () {

    var canvas = document.getElementById("glcanvas");
    Graphics.init(canvas);
    
    this.start_time = Date.now();
    this.last_time = 0;

    this.update();

  },
  
  update: function() {

    var nowTime = Date.now() - this.start_time;
    var deltaTime = nowTime - this.last_time;

    if (nowTime - this.last_time > 1000 / FPSLimit) {
      this.last_time = nowTime;
      let time = { nowTime: nowTime, deltaTime: deltaTime };
      Graphics.update(time);
    }

    var fn = this.update.bind(this);
    window.requestAnimationFrame(fn);

  },

  getPaletteParam: function(name) {
    var data = Graphics.getPaletteParam(name);
    return data;
  },

  getPaletteValue: function(name) {
    var value = Graphics.getPaletteValue(name);
    return value;
  },

  setPaletteValue: function(name, value) {
    Graphics.setPaletteValue(name, value);
  }
  
};

module.exports = App;
