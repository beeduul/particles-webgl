"use strict";

var Graphics = require('graphics');
let Layer = require('layer');

var FPSLimit = 30;

var App = {
  
  last_time: undefined,
  start_time: undefined,
  
  shaders: {
    // example: {
    //   program: undefined, // created in initShaders
    //   attributes: {
    //     attr_name: {}
    //   },
    //   uniforms: {
    //     uniform_name: { value: value }
    //   }
    // },
    point_painter: {
      name: 'point_painter',
      attributes: {
        aUV: {}
      },
    },
    painter: {
     name: 'painter',
      attributes: {
        aUV: {},
        aVert: {},
      },
    },
    simulator: {
      dataBufferCount: 6,
      name: 'simulator',
      attributes: {
        aPosition: {},
      },
    },
  },

  isInitialized: function() {
    return this.start_time != undefined;
  },

  init: function () {

    var canvas = this.canvas = document.getElementById("glcanvas");
    Graphics.init(canvas, this.shaders);
    this.onWindowResize();
    
    
    const PALETTE_PARAMS = {
      symmetry:         { default: 4,     min: 1,     max: 16    },
      colorHue:         { default: Math.random() * 360,     min: 0,     max: 360   }, // hue is in degress
      saturation:       { default: 1,     min: 0,     max: 1.0   }, // saturation is 0 .. 1
      colorNoise:       { default: 0.1,   min: 0,     max: 1     },
      spray:            { default: 0,     min: 0,     max: 0.1   }, // percent of screen
      size:             { default: 25.0,  min: 1,     max: 100   },
      age:              { default: 2500,  min: 500,   max: 30000 }, // ms
      pulse:            { default: 0,     min: 0,     max: 2.0   },  // pulses per second
      flow:             { default: 50,    min: 10,    max: 250   },  // particles per second
      accel:            { default: 0,     min: -10,   max: 10     },
      decay:            { default: 0.999, min: 0.95,  max: 1     }
    };

    this.layer = new Layer(PALETTE_PARAMS, this.shaders);
    this.activeLayer = this.layer;

    canvas.addEventListener("mousedown", function(event) {
      this.handleMouseEvent(event);
    }.bind(this));

    canvas.addEventListener("mousemove", function(event) {
      this.handleMouseEvent(event);
    }.bind(this));

    canvas.addEventListener("mouseup", function(event) {
      this.handleMouseEvent(event);
    }.bind(this));

    (function(self) {
      window.addEventListener(
        'resize', function() {self.onWindowResize();}, false
      );

      ['keydown', 'keypress', 'keyup'].forEach(function(eventType) {
        window.addEventListener(eventType, function(event) {
          self.handleKeyEvent(event);
        });
      });

      window.addEventListener('mousewheel', function(event) {
        console.log(event);
        event.preventDefault();
      });

    })(this);

    this.start_time = Date.now();
    this.last_time = 0;

    this.update();

  },
  
  onWindowResize: function() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // this.camera.aspect = this.width/this.height;
  },
  
  update: function() {

    var nowTime = Date.now() - this.start_time;
    var deltaTime = nowTime - this.last_time;

    if (nowTime - this.last_time > 1000 / FPSLimit) {
      this.last_time = nowTime;
      let time = { nowTime: nowTime, deltaTime: deltaTime };      
      this.activeLayer.update(this.canvas, time);
    }

    var fn = this.update.bind(this);
    window.requestAnimationFrame(fn);

  },

  handleMouseEvent: function(event) {
    this.activeLayer.handlePointerEvent(event);
  },

  handleKeyEvent: function(event) {
    switch(event.type) {
    case "keydown":
      switch(event.key) {
      case "r":
        this.activeLayer.setRecording(true);
        break;
      case "f":
        Graphics.toggleFullScreen();
        break;
      }
      break;
    case "keyup":
      switch(event.key) {
      case "r":
        this.activeLayer.setRecording(false);
        break;
      }

    case "keypress":
      break;
    }
  },

  getPaletteParam: function(name) {
    return this.activeLayer.getPaletteParam(name);
  },

  getPaletteValue: function(name) {
    return this.activeLayer.getPaletteValue(name);
  },

  setPaletteValue: function(name, value) {
    this.getPaletteParam(name).value = value;
  },
  
  setDrawType: function(value) {
    this.activeLayer.setDrawType(value);
  }
  
};

module.exports = App;
