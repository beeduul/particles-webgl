"use strict";

let Enum = require('es6-enum');

let GLUtil = require('gl_util');
var glMatrix = require('gl-matrix');
let Color = require('color');

let Palette = require('palette');
let Simulation = require('simulation');
let VCR = require('vcr');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const DRAW_TYPE = Enum('POINTS', 'LINES', 'TRIANGLES', 'SQUARES');

class Layer {
  constructor(palette_params, shaders) {

    this.lastLoc = null;
    this.accelAngle = Math.random() * Math.PI * 2.0;

    this.shaders = shaders; // TODO deep copy

    this.drawType = DRAW_TYPE.SQUARES;

    this.palette = new Palette(palette_params);
    this.simulation = new Simulation(this.shaders.simulator);

    this.vcr = new VCR();

    this.addAccumulator = 0;
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
  
  draw(time) {

    var gl = GLUtil.gl();
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.GREATER);

    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var shader;
    if (this.drawType == DRAW_TYPE.POINTS) {
      shader = this.shaders.point_painter;
    } else {
      shader = this.shaders.painter;
    }
    gl.useProgram(shader.program);

    if (shader.uniforms.nowTime) {
      gl.uniform1f(shader.uniforms.nowTime.location, time.nowTime);
    }
    if (shader.uniforms.maxLifeTime) {
      var maxLifeTime = this.getPaletteParam('age').max;
      gl.uniform1f(shader.uniforms.maxLifeTime.location, maxLifeTime);
    }
    if (shader.uniforms.deltaTime) {
      gl.uniform1f(shader.uniforms.deltaTime.location, time.deltaTime);
    }


    for (var tx_idx = 0; tx_idx < this.simulation.dataBufferCount(); tx_idx++) {
      var uniform = shader.uniforms["uTexture" + tx_idx];
      if (uniform) {
        gl.activeTexture(gl.TEXTURE0 + tx_idx);
        gl.bindTexture(gl.TEXTURE_2D, this.simulation.previous.textures[tx_idx]);
        gl.uniform1i(uniform.location, tx_idx);
      }
    }

    if (this.drawType == DRAW_TYPE.POINTS) {
      // bind the particleUV vertex buffer to GPU
      gl.enableVertexAttribArray(shader.attributes.aUV.location);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.simulation.particleUV.buffer);
      gl.vertexAttribPointer(
        shader.attributes.aUV.location,
        this.simulation.particleUV.numComponents, gl.FLOAT, false, 0, 0
      );

      gl.drawArrays(gl.POINTS, 0, this.simulation.particleUV.count);
    } else if (this.drawType == DRAW_TYPE.LINES) {
      gl.enableVertexAttribArray(shader.attributes.aUV.location); // indices into 0, 0, 1, 1, 2, 2
      gl.bindBuffer(gl.ARRAY_BUFFER, this.simulation.particleLineUV.buffer);
      gl.vertexAttribPointer(
        shader.attributes.aUV.location,
        this.simulation.particleLineUV.numComponents, gl.FLOAT, false, 0, 0
      );

      gl.enableVertexAttribArray(shader.attributes.aVert.location);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.simulation.particleVerts.buffer);
      gl.vertexAttribPointer(
        shader.attributes.aVert.location,
        this.simulation.particleVerts.numComponents, gl.FLOAT, false, 0, 0
      );

      // gl.lineWidth(1.0);
      gl.drawArrays(gl.LINES, 0, this.simulation.particleLineUV.count);
      gl.disableVertexAttribArray(shader.attributes.aVert.location);
      
    } else if (this.drawType == DRAW_TYPE.TRIANGLES) {
      gl.enableVertexAttribArray(shader.attributes.aUV.location);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.simulation.particleTriUV.buffer);
      gl.vertexAttribPointer(
        shader.attributes.aUV.location,
        this.simulation.particleTriUV.numComponents, gl.FLOAT, false, 0, 0
      );
      
      gl.enableVertexAttribArray(shader.attributes.aVert.location);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.simulation.particleTris.buffer);
      gl.vertexAttribPointer(
        shader.attributes.aVert.location,
        this.simulation.particleTris.numComponents, gl.FLOAT, false, 0, 0
      );
      
      gl.drawArrays(gl.TRIANGLES, 0, this.simulation.particleTriUV.count);
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

  getCurrentColor() {
    // this.setPaletteValue('colorHue', Math.random() * 360);
    let s = this.getPaletteValue('saturation');
    let hsv = Color.createHSV( {
      h: this.getPaletteValue('colorHue'),
      s: s
    } );
    return Color.hsvToRgb(hsv);
  }

  handlePointerEvent(event) {
    var eventPos = new glMatrix.vec2.fromValues(event.x, event.y);

    if (event.type == "mousedown") {

      this.rgb = this.getCurrentColor();
      
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
      this.accelAngle += Math.random() * Math.PI * 2.0 / 100.0;
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
        var spray = this.getPaletteValue('spray');
        var thisPart = glMatrix.vec2.create();
        glMatrix.vec2.add(thisPart, symP, dragVector_t);
        thisPart[0] = (thisPart[0] / this.canvas.width) * 2.0 - 1.0 + (2 * Math.random() - 1) * spray;
        thisPart[1] = (thisPart[1] / this.canvas.height) * -2.0 + 1.0 + (2 * Math.random() - 1) * spray;
        
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
