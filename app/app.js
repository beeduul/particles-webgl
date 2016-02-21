"use strict";

var Graphics = require('graphics');

var App = {
  last_time: undefined,
  
  start_time: undefined,
  
  init: function () {
    var canvas = document.getElementById("glcanvas");
    Graphics.init(canvas);
    
    this.start_time = this.last_time = Date.now();
    
    this.update();
  },
  
  update: function() {
    var now_time = Date.now();
    var delta_time = now_time - this.last_time;
    this.last_time = now_time;

    Graphics.update(delta_time)
    var fn = this.update.bind(this);
    window.requestAnimationFrame(fn);
  }
  
};

module.exports = App;
