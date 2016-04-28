"use strict";

var Graphics = require('graphics');

var FPSLimit = 30;

var App = {
  last_time: undefined,
  
  start_time: undefined,
  
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
      Graphics.update(nowTime, deltaTime)
    }

    var fn = this.update.bind(this);
    window.requestAnimationFrame(fn);
  },
  getSimulationParam: function(name) {
    var data = Graphics.getSimulationParam(name);
    return data;
  },

  getSimulationValue: function(name) {
    var value = Graphics.getSimulationValue(name);
    return value;
  },

  setSimulationValue: function(name, value) {
    Graphics.setSimulationValue(name, value);
  }
  
};

module.exports = App;
