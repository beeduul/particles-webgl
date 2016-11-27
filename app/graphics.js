"use strict";

let glsl = require('glslify');

let GLUtil = require('gl_util');

var Graphics = {

  gl: null,
  width: undefined,
  height: undefined,

  initShaders: function(gl, shaders) {
    for (var shaderName in shaders) {
      console.log(shaderName);
      initShader(gl, shaderName, shaders);
    }
  },

  init: function(canvas, shaders) {
    // init gl
    GLUtil.setupGL(canvas, ["WEBGL_draw_buffers", "OES_texture_float", "ANGLE_instanced_arrays"]);
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
  
  for (var i = 0; i < shaders.simulator.dataBufferCount; i++) {
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
