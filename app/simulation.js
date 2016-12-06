"use strict";

let GLUtil = require('gl_util');

const SIMULATION_WIDTH = 16384; // largest texture supported by chrome, 256 * 64; TODO
const SIMULATION_HEIGHT = 1;

function createParticleUV() {
  const width = SIMULATION_WIDTH;
  const height = SIMULATION_HEIGHT;

  var buffer = [];
  for (var y=0; y<height; ++y) {
    for (var x=0; x<width; ++x) {
      buffer.push(x/width);
      buffer.push(y/height);
    }
  }

  const numComponents = 2;
  const data = new Float32Array(buffer);

  return GLUtil.createVertexBuffer(numComponents, data);
}

var _fsQuadBuffer;

class GPUSimulation {
  constructor(simulation) {
    this.simulation = simulation;
    this.particleUV = createParticleUV();
    this.num_particles = 0;
  
    // initBuffers - for simulation - create textures, create framebuffer, bind textures to framebuffer, setup gl_FragData outputs for simulation shader
    this.previous = this._createState();
    this.current = this._createState();
  }
  
  dataBufferCount() {
    return this.simulation.dataBufferCount();
  }
  
  _createState() {

    var gl = GLUtil.gl();
    var draw_buffers_ext = GLUtil.extensions().WEBGL_draw_buffers;
    
    let w = SIMULATION_WIDTH;
    let h = SIMULATION_HEIGHT;

    var size = w * h * 4;
    var src_buffer = new Float32Array(size);
    for (var i = 0; i < size; i++) {
      src_buffer[i] = 0;
    }
    
    var state = {
      frame_buffer: gl.createFramebuffer(),
      aux_frame_buffers: [],
      textures: []
    }
  
    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      var tx = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, src_buffer);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, null);
      src_buffer = null;

      state.textures[tx_idx] = (tx);
    }
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.frame_buffer);
    var color_attachments = [];
    for (var color_attachment_idx = 0; color_attachment_idx < this.dataBufferCount(); color_attachment_idx++) {
      color_attachments[color_attachment_idx] = (draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL + color_attachment_idx); // gl_FragData[color_attachment_idx]
    }

    state.color_attachments = color_attachments;

    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      var tx = state.textures[tx_idx];
      gl.framebufferTexture2D(gl.FRAMEBUFFER, color_attachments[tx_idx], gl.TEXTURE_2D, tx, 0);
    }
    
    // attach textures to gl_FragData[] outputs
    draw_buffers_ext.drawBuffersWEBGL(state.color_attachments);
    
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("Can't use main framebuffer.");
      // See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
    }
    if (!gl.isFramebuffer(state.frame_buffer)) {
      console.error("Frame buffer failed");
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      var tx = state.textures[tx_idx];
      var aux_fb = gl.createFramebuffer();
      state.aux_frame_buffers[tx_idx] = aux_fb;
      gl.bindFramebuffer(gl.FRAMEBUFFER, aux_fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, tx, 0);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Can't use aux_fb " + tx_idx);
        // See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    return state;
  }

  simulate(time, shader) {
    var gl = GLUtil.gl();

    // write the output of the simulation to the current framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.current.frame_buffer);

    var draw_buffers_ext = GLUtil.extensions().WEBGL_draw_buffers;
    draw_buffers_ext.drawBuffersWEBGL(this.current.color_attachments);

    gl.viewport(0, 0, SIMULATION_WIDTH, SIMULATION_HEIGHT);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);  // so alpha output color draws correctly

    // make sure no DEPTH_TEST
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(shader.program);

    // send vertex information to GPU
    
    let fsQuadBuffer = Simulation.getFullScreenQuadBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, fsQuadBuffer.buffer);
    gl.enableVertexAttribArray(shader.attributes.aPosition.location);
    gl.vertexAttribPointer(
      shader.attributes.aPosition.location, // index of target attribute in the buffer bound to gl.ARRAY_BUFFER
      fsQuadBuffer.numComponents, // number of components per attribute
      gl.FLOAT, false, 0, 0);  // type, normalized, stride, offset

    // update shader uniforms

    // enable texture samplers in shader
    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      gl.activeTexture(gl.TEXTURE0 + tx_idx);
      gl.bindTexture(gl.TEXTURE_2D, this.previous.textures[tx_idx]);
      gl.uniform1i(shader.uniforms["uTexture" + tx_idx].location, tx_idx);
    }

    gl.uniform1f(shader.uniforms.nowTime.location, time.nowTime);
    gl.uniform1f(shader.uniforms.deltaTime.location, time.deltaTime);
    gl.uniform2f(shader.uniforms.uResolution.location,
      SIMULATION_WIDTH,
      SIMULATION_HEIGHT
    );

    if (shader.params) {
      Object.keys(shader.params).forEach(function(key) {
        var param = shader.params[key];
        if (Array.isArray(param.value)) {
          switch(param.value.length) {
            case 1: gl.uniform1f(param.location, param.value[0]); break;
            case 2: gl.uniform2f(param.location, param.value[0], param.value[1]); break;
            case 3: gl.uniform3f(param.location, param.value[0], param.value[1], param.value[2]); break;
            case 4: gl.uniform4f(param.location, param.value[0], param.value[1], param.value[2], param.value[3]); break;
            default: throw ("unhandled length " + param.value.length)
          }
        } else {
          switch(param.type) {
          case "i":
            gl.uniform1i(param.location, param.value);
            break;
          default:
            gl.uniform1f(param.location, param.value);
            break;
          }
        }
      });
    }
        
    // 'draw' the simulation
    gl.drawArrays(gl.TRIANGLES, 0, fsQuadBuffer.count);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aPosition.location);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  swapBuffers() {
    var temp = this.current;
    this.current = this.previous;
    this.previous = temp;
  }

  setupForDrawing(shader, uniforms) {
    let gl = GLUtil.gl();

    let uniformNames = Object.keys(uniforms);
    for (let uniformName of uniformNames) {
      let uniformValue = uniforms[uniformName];
      if (shader.uniforms[uniformName]) {
        let length = uniformValue.constructor == Array ? uniformValue.length : 1;
        if (length == 1) {
          gl.uniform1f(shader.uniforms[uniformName].location, uniformValue);
        } else {
          gl[`uniform${length}f`](shader.uniforms[uniformName].location, ...uniformValue);
        }
      }
    };

    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      let uniform = shader.uniforms["uTexture" + tx_idx];

      if (uniform) {
        gl.activeTexture(gl.TEXTURE0 + tx_idx);
        gl.bindTexture(gl.TEXTURE_2D, this.previous.textures[tx_idx]);
        gl.uniform1i(uniform.location, tx_idx);
      }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleUV.buffer);
    gl.enableVertexAttribArray(shader.attributes.aUV.location);
    gl.vertexAttribPointer(
      shader.attributes.aUV.location,
      this.particleUV.numComponents, gl.FLOAT, false, 0, 0
    );
  }

  loadParticleOntoGPU(txArr) {
    const shortBuf = new Float32Array(4 * 4);
    var gl = GLUtil.gl();

    const sim_width = SIMULATION_WIDTH;
    const sim_height = SIMULATION_HEIGHT;
      
    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      var tx = this.previous.textures[tx_idx];
      var aux_fb = this.previous.aux_frame_buffers[tx_idx];
  
      gl.bindFramebuffer(gl.FRAMEBUFFER, aux_fb);

      var sim_x = this.num_particles % sim_width;
      var sim_y = Math.floor(this.num_particles / sim_width);
      if (sim_x == 0 && sim_y == SIMULATION_HEIGHT) {
        sim_y = 0;
      }

      var spaceAvailable = sim_width - sim_x;

      for (var i = 0; i < 4; i++) {
        shortBuf[i] = txArr[tx_idx][i];
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tx);

      if (spaceAvailable < 4) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, sim_x, sim_y, spaceAvailable, 1, gl.RGBA, gl.FLOAT, shortBuf);
        var overflow = 4 - spaceAvailable;
        var overBuf = new Float32Array(overflow * 4);
        for (var i = 0; i < overBuf; i++) {
          overBuf[i] = shortBuf[spaceAvailable + i];
        }
        var newY = (sim_y + 1) % sim_height;
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, newY, overflow, 1, gl.RGBA, gl.FLOAT, overBuf);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, sim_x, sim_y, 4, 1, gl.RGBA, gl.FLOAT, shortBuf);
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.num_particles += 1;
    if (this.num_particles > sim_width * sim_height) {
      this.num_particles = 0;
    }
    
  }
  
}

class Simulation {

  static getFullScreenQuadBuffer() {
    if (!this._fsQuadBuffer) {
      this._fsQuadBuffer = GLUtil.createVertexBuffer(3, new Float32Array([
        -1.0, -1.0,  0.0,
         1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0,
         1.0,  1.0,  0.0
      ]));
    }
    
    return this._fsQuadBuffer;
  }

  constructor(simulation_shader) {
    this.simulation_shader = simulation_shader;
    this.gpuSimulation = new GPUSimulation(this);
  }
  
  getInstanceCount() {
    return SIMULATION_WIDTH * SIMULATION_HEIGHT;
  }
  
  isInitialized() {
    return (this.current && this.previous);
  }
  
  dataBufferCount() {
    return this.simulation_shader.dataBufferCount;
  }
  
  simulate(time) {
    this.gpuSimulation.simulate(time, this.simulation_shader);
  }

  swapBuffers() {
    this.gpuSimulation.swapBuffers();
  }
  
  setupForDrawing(shader, uniforms) {
    this.gpuSimulation.setupForDrawing(shader, uniforms);
  }

  loadParticleOntoGPU(txArr) {
    // check if 
    this.gpuSimulation.loadParticleOntoGPU(txArr);
  }

}

module.exports = Simulation;