"use strict";

let glsl = require('glslify');

let GLUtil = require('gl_util');

let Layer = require('layer');

var Graphics = {

  gl: null,
  canvas: null,
  width: undefined,
  height: undefined,

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
        aX: {},
      },
    },
    simulator: {
      name: 'simulator',
      attributes: {
        aPosition: {},
      },
    },
  },

  initShaders: function(gl) {
    for (var shaderName in this.shaders) {
      console.log(shaderName);
      initShader(gl, shaderName, this.shaders);
    }
  },

  init: function(canvas) {
    // init canvas
    this.canvas = canvas;
    this.onWindowResize();

    // init gl
    var gl = GLUtil.initWebGL(this.canvas);
    GLUtil.setupGL(this.canvas, ["WEBGL_draw_buffers", "OES_texture_float"]); // OES_vertex_array_object

    // init shaders
    this.initShaders(gl);

    const PALETTE_PARAMS = {
      symmetry:         { default: 4,     min: 1,     max: 16    },
      colorHue:         { default: 0,     min: 0,     max: 360   }, // hue is in degress
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

  },

  requestFullScreen: function(element) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if(element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if(element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  },

  exitFullScreen: function() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if(document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if(document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  },

  toggleFullScreen: function() {
    var element = document.documentElement;
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!fullscreenElement) {
      this.requestFullScreen(element);
    } else {
      this.exitFullScreen();
    }
  },

  handleKeyEvent: function(event) {
    switch(event.type) {
    case "keydown":
      switch(event.key) {
      case "r":
        this.activeLayer.setRecording(true);
        break;
      case "f":
        this.toggleFullScreen();
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

  handleMouseEvent: function(event) {
    this.activeLayer.handlePointerEvent(event);
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

  update: function(time) {
    this.activeLayer.update(this.canvas, time);
  },

  onWindowResize: function() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // this.camera.aspect = this.width/this.height;
  },



};

function initShader(gl, shaderName, shaders)
{
  var shader = shaders[shaderName];

  createProgramFromScripts(gl, shaderName, shader);

  shader.uniforms = {};

  var uniforms = ['deltaTime', 'nowTime', 'maxLifeTime', 'uResolution'];
  
  for (var uniformName of uniforms) {
    var glLoc = gl.getUniformLocation(shader.program, uniformName);
    console.log(`${shaderName}: uniform ${uniformName} - ${glLoc}`)
    if (glLoc) {
      shader.uniforms[uniformName] = glLoc;
    }
  }
  
  for (var i = 0; i < 6; i++) {
    var uniformName = `uTexture${i}`;
    var glLoc = gl.getUniformLocation(shader.program, uniformName);
    console.log(`${shaderName}: uniform ${uniformName} - ${glLoc}`)
    if (glLoc) {
      shader.uniforms[uniformName] = glLoc;
    }
  }

  // get attribute and uniform locations
  for (var attributeName in shader.attributes) {
    shader.attributes[attributeName].location = gl.getAttribLocation(shader.program, attributeName);
    console.log("attribute: ", attributeName, ", location: ", shader.attributes[attributeName].location);
  }
  for (var uniformName in shader.uniforms) {
    shader.uniforms[uniformName].location = gl.getUniformLocation(shader.program, uniformName);
    console.log("uniform: ", uniformName, ", location: ", shader.uniforms[uniformName].location);
  }
  for (var uniformName in shader.params) {
    shader.params[uniformName].location = gl.getUniformLocation(shader.program, uniformName);
    console.log("param: ", uniformName, ", location: ", shader.params[uniformName].location);
  }
}

/**
* Creates and compiles a shader.
*
* @param {!WebGLRenderingContext} gl The WebGL Context.
* @param {string} shaderSource The GLSL source code for the shader.
* @param {number} shaderType The type of shader, VERTEX_SHADER or
*     FRAGMENT_SHADER.
* @return {!WebGLShader} The shader.
*/
function compileShader(gl, filename, shaderSource, shaderType) {
  // Create the shader object
  var shader = gl.createShader(shaderType);

  // Set the shader source code.
  gl.shaderSource(shader, shaderSource);

  // Compile the shader
  gl.compileShader(shader);

  // Check if it compiled
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    // Something went wrong during compilation; get the error
    throw "could not compile shader (" + filename + "):" + gl.getShaderInfoLog(shader);
  }

  return shader;
}

/**
* Creates a shader from the content of a script tag.
*
* @param {!WebGLRenderingContext} gl The WebGL Context.
* @param {string} filename The filename of the script tag.
* @param {string} opt_shaderType. The type of shader to create.
*     If not passed in will use the type attribute from the
*     script tag.
* @return {!WebGLShader} A shader.
*/
function createShaderFromScript(gl, filename, opt_shaderType) {

  var shaderSource = require(filename);

  return compileShader(gl, filename, shaderSource, opt_shaderType);
};

/**
* Creates a program from 2 shaders.
*
* @param {!WebGLRenderingContext) gl The WebGL context.
* @param {!WebGLShader} vertexShader A vertex shader.
* @param {!WebGLShader} fragmentShader A fragment shader.
* @return {!WebGLProgram} A program.
*/
function createProgram(gl, vertexShader, fragmentShader) {
  // create a program.
  var program = gl.createProgram();

  // attach the shaders.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // link the program.
  gl.linkProgram(program);

  // Check if it linked.
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
     // something went wrong with the link
     throw ("program filed to link:" + gl.getProgramInfoLog (program));
  }

  return program;
};

/**
* Creates a program from 2 script tags.
*
* @param {!WebGLRenderingContext} gl The WebGL Context.
* @param {string} vertexShaderId The id of the vertex shader script tag.
* @param {string} fragmentShaderId The id of the fragment shader script tag.
* @return {!WebGLProgram} A program
*/
function createProgramFromScripts(gl, shaderName, shader) {
  var vertexShader = createShaderFromScript(gl, `glsl/${shaderName}_vs.glsl`, gl.VERTEX_SHADER);
  var fragmentShader = createShaderFromScript(gl, `glsl/${shaderName}_fs.glsl`, gl.FRAGMENT_SHADER);
  shader.program = createProgram(gl, vertexShader, fragmentShader);
}

module.exports = Graphics;
