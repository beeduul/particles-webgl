"use strict";

var Graphics = require('graphics');

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
    this.last_time = nowTime;

    Graphics.update(nowTime, deltaTime)
    var fn = this.update.bind(this);
    window.requestAnimationFrame(fn);
  }
  
};

module.exports = App;
