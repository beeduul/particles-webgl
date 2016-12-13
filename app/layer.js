"use strict";

let GLUtil = require('gl_util');
var glMatrix = require('gl-matrix');

let Palette = require('palette');
let Simulation = require('simulation');
let VCR = require('vcr');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

let uid = 0;
function getUID() {
  return uid++;
}

let DrawTypes = require('drawtypes');

var _lineBuffer;
var _triBuffer;
var _quadStripBuffer;
var _hexStripBuffer;

class Layer {

  static getLineBuffer() {
    if (!_lineBuffer) {
      _lineBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
        -1, 0,
        1,  1
      ]));
    } 
    
    return _lineBuffer;
  }

  static getTriBuffer() {
    if (!_triBuffer) {
      _triBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
           0,  1/2,
         3/5, -1/2,
        -3/5, -1/2
      ]));
    }
    
    return _triBuffer;
  }

  static getQuadStripBuffer() {
    if (!_quadStripBuffer) {
      _quadStripBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
        -1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,
         1.0, -1.0
      ]));
    }
    
    return _quadStripBuffer;
  }

  static getHexStripBuffer() {
    if (!_hexStripBuffer) {
      _hexStripBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
        1, 0,
        0.5, -4/5,
        -0.5, -4/5,
        -1, 0,
        -0.5, 4/5,
        0.5, 4/5
      ]));
    }

    return _hexStripBuffer;
  }

  constructor(palette_params, shaders) {

    this.lastLoc = null;
    this.accelAngle = Math.random() * Math.PI * 2.0;

    this.shaders = shaders; // TODO deep copy

    this.palette = new Palette(palette_params);
    this.simulation = new Simulation(this.shaders.simulator);

    this.vcr = new VCR();

    this.addAccumulator = 0;

    this.uid = getUID();
  }

  get drawType() {
    return this.palette.drawType;
  }
  
  set drawType(drawType) {
    this.palette.drawType = drawType;
  }

  getPaletteParam(name) {
    return this.palette.getParam(name);
  }
  
  getPaletteValue(name) {
    return this.palette.getValue(name);
  }
  
  setRecording(bool) {
    this.vcr.recording = bool;
  }

  update(canvas, time) {
    
    this.canvas = canvas; // TODO refactor
    
    this.time = time;
    
    this.vcr.play(time, this);
    
    this.simulation.simulate(time);
    this.draw(time);
    
    this.simulation.swapBuffers();
  }
  
  getShaderForDrawType(drawType) {
    let shaders = this.shaders;
    return (drawType == DrawTypes.CIRCLE_SHADED) ? shaders.point_painter : shaders.painter;
  }
  
  draw(time) {

    var gl = GLUtil.gl();
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.GREATER);

    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var shader = this.getShaderForDrawType(this.drawType);
    gl.useProgram(shader.program);

    let uniforms = {
      nowTime: time.nowTime,
      maxLifeTime: this.getPaletteParam('age').max,
      deltaTime: time.deltaTime,
      canvasSize: [this.canvas.width, this.canvas.height]
    }

    this.simulation.setupForDrawing(shader, uniforms);

    if (this.drawType == DrawTypes.CIRCLE_SHADED) {

      gl.drawArrays(gl.POINTS, 0, this.simulation.getInstanceCount());

    } else {
      
      var vertexBuffer;
      var glDrawMode;
      switch(this.drawType) {
      case DrawTypes.TRI_FILLED:
        vertexBuffer = Layer.getTriBuffer();
        glDrawMode = gl.TRIANGLES;
        break;
      case DrawTypes.TRI_STROKED:
        vertexBuffer = Layer.getTriBuffer();
        glDrawMode = gl.LINE_LOOP;
        break;
      case DrawTypes.SQUARE_FILLED:
        vertexBuffer = Layer.getQuadStripBuffer();
        glDrawMode = gl.TRIANGLE_FAN;
        break;
      case DrawTypes.SQUARE_STROKED:
        vertexBuffer = Layer.getQuadStripBuffer();
        glDrawMode = gl.LINE_LOOP;
        break;
      case DrawTypes.HEX_STROKED:
        vertexBuffer = Layer.getHexStripBuffer();
        glDrawMode = gl.LINE_LOOP;
        break;
      case DrawTypes.HEX_FILLED:
        vertexBuffer = Layer.getHexStripBuffer();
        glDrawMode = gl.TRIANGLE_FAN;
        break;
      case DrawTypes.LINES:
      default:
        vertexBuffer = Layer.getLineBuffer();
        glDrawMode = gl.LINES;
        break;
      }

      var ext = GLUtil.extensions()['ANGLE_instanced_arrays'];

      ext.vertexAttribDivisorANGLE(shader.attributes.aUV.location, 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
      gl.enableVertexAttribArray(shader.attributes.aVert.location);
      gl.vertexAttribPointer(
        shader.attributes.aVert.location,
        vertexBuffer.numComponents,
        gl.FLOAT, false, 0, 0
      );

      ext.drawArraysInstancedANGLE(
        glDrawMode,
        0,
        vertexBuffer.count,
        this.simulation.getInstanceCount()
      );
     
      ext.vertexAttribDivisorANGLE(shader.attributes.aUV.location, 0);
      gl.disableVertexAttribArray(shader.attributes.aVert.location);
    }
    
    // gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aUV.location);
    gl.useProgram(null);
    // gl.disable(gl.BLEND);
  }

  // palette
  // simulation
  // vcr
  
  // pointer event handling

  handlePointerEvent(event) {
    var eventPos = new glMatrix.vec2.fromValues(event.clientX, event.clientY);

    if (event.type == "mousedown") {

      this.rgb = this.palette.getCurrentColor();
      
      this.vcr.recordEvent(eventPos, this.rgb);
    
      this.addParticlesAt(eventPos, this.rgb, this.time);

    } else if (event.type == "mousemove") {

      if (this.rgb) {
        this.vcr.recordEvent(eventPos, this.rgb);
        this.addParticlesAt(eventPos, this.rgb, this.time);
      }

    } else if (event.type == "mouseup") {

      this.rgb = null;
      this.lastLoc = null;

    }
    
  }

  addParticlesAt(loc, rgb, time) {

    var txArr = [];
    for (var n = 0; n < this.simulation.dataBufferCount(); n++) {
      txArr.push([]);
    }

    this.addAccumulator += this.getPaletteValue('flow') * (time.deltaTime / 1000);

    if (this.addAccumulator < 1)
      return;
    
    var numToAdd = Math.floor(this.addAccumulator);
    this.addAccumulator = 0;
    
    const center = glMatrix.vec2.fromValues(this.canvas.width / 2.0, this.canvas.height / 2.0);
    var pVec = glMatrix.vec2.create();
    glMatrix.vec2.sub(pVec, loc, center);
    
    var pAngle = Math.atan2(pVec[1], pVec[0]);

    var pLastVec = glMatrix.vec2.create();
    glMatrix.vec2.sub(pLastVec, this.lastLoc || loc, center);
    
    var pLastAngle = Math.atan2(pLastVec[1], pLastVec[0]);

    let wander = false;// this.getPaletteValue('wander');
    if (wander) {
      this.accelAngle += (Math.random() - 0.5) * 2.0 * Math.PI * 2.0 / 100.0;
    }

    var numSymmetries = Math.ceil(this.getPaletteValue('symmetry'));
    for (var s = 0; s < numSymmetries; s++) {

      var symP = glMatrix.vec2.fromValues(Math.cos(pAngle), Math.sin(pAngle));
      glMatrix.vec2.scale(symP, symP, glMatrix.vec2.length(pVec));
      glMatrix.vec2.add(symP, symP, center);

      var lastSymP = glMatrix.vec2.fromValues(Math.cos(pLastAngle), Math.sin(pLastAngle));
      glMatrix.vec2.scale(lastSymP, lastSymP, glMatrix.vec2.length(pLastVec));
      glMatrix.vec2.add(lastSymP, lastSymP, center);
      
      var dragVector = glMatrix.vec2.fromValues(0, 0);
      glMatrix.vec2.sub(dragVector, symP, lastSymP);

      for (var p = 0; p < numToAdd; p++) {

        var t = p / numToAdd; // t is interpolation value along mouse stroke

        var dragVector_t = glMatrix.vec2.create();
        glMatrix.vec2.scale(dragVector_t, dragVector, t);

        // px, py, dx, dy
        var thisPart = glMatrix.vec2.create();
        glMatrix.vec2.add(thisPart, symP, dragVector_t);

        var spray = this.getPaletteValue('spray');
        var angleOffset = Math.random() * Math.PI * 2.0;
        var distanceFromCenter = Math.random();
        thisPart[0] = (thisPart[0] / this.canvas.width) * 2.0 - 1.0 + Math.cos(angleOffset) * spray * distanceFromCenter;
        thisPart[1] = (thisPart[1] / this.canvas.height) * -2.0 + 1.0 + Math.sin(angleOffset) * spray * distanceFromCenter;
        
        var dx = 0;
        var dy = 0;
        if (this.lastLoc) {
          dx = dragVector[0] / this.canvas.width * 10;
          dy = -dragVector[1] / this.canvas.height * 10;
        }

        txArr[0][0] = thisPart[0];
        txArr[0][1] = thisPart[1];
        txArr[0][2] = dx;
        txArr[0][3] = dy;

        // accel.x, accel.y, decay, n/a -- "gravity" values
        var thisAccel;
        if (wander) {
          thisAccel = glMatrix.vec2.fromValues(Math.cos(this.accelAngle), Math.sin(this.accelAngle)); // wandering gravity direction
        } else {
          thisAccel = glMatrix.vec2.clone(thisPart); // center gravity
          // glMatrix.vec2.sub(thisAccel, thisPart, center);
        }
        glMatrix.vec2.normalize(thisAccel, thisAccel);
        var accel = this.getPaletteValue('accel');
        glMatrix.vec2.scale(thisAccel, thisAccel, accel);
        txArr[1][0] = thisAccel[0];
        txArr[1][1] = thisAccel[1];
        txArr[1][2] = this.getPaletteValue('decay') - Math.random() * 0.05;
        txArr[1][3] = 0;

        // birthColor r, g, b, birthTime
        var colorNoise = this.getPaletteValue('colorNoise');
        txArr[2][0] = clamp(rgb[0] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[2][1] = clamp(rgb[1] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[2][2] = clamp(rgb[2] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[2][3] = time.nowTime;
      
        // deathcolor r, g, b, deathTime
        txArr[3][0] = clamp(1.0 - rgb[0] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[3][1] = clamp(1.0 - rgb[1] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[3][2] = clamp(1.0 - rgb[2] + (2 * Math.random() - 1) * colorNoise, 0, 1);
        txArr[3][3] = time.nowTime + this.getPaletteValue('age');

        // size, pulse frequency, n/a, n/a
        var size = this.getPaletteValue('size');
        const sizeScaleFactor = 0.5;
        size = size + size * (2 * Math.random() - 1) * sizeScaleFactor;
        txArr[4][0] = size;
        txArr[4][1] = this.getPaletteValue("pulse");
        txArr[4][2] = 0;
        txArr[4][3] = 0;

        txArr[5][0] = pLastAngle;
        txArr[5][1] = (Math.random() - 0.5) / 2 * glMatrix.vec2.length(dragVector) / 3;
        txArr[5][2] = 0;
        txArr[5][3] = 0;

        this.simulation.loadParticleOntoGPU(txArr);
      }
      
      pAngle += Math.PI * 2.0 / numSymmetries;
      pLastAngle += Math.PI * 2.0 / numSymmetries;
      
    }
    
    this.lastLoc = loc;
  }
  
  
}

module.exports = Layer;
