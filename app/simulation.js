"use strict";

let GLUtil = require('gl_util');

const SIMULATION_DIM = 256;

function createFullScreenQuadVertexBuffer() {
  const numComponents = 3;
  const data = new Float32Array([
   -1.0, -1.0,  0.0,
    1.0,  1.0,  0.0,
   -1.0,  1.0,  0.0,
   -1.0, -1.0,  0.0,
    1.0, -1.0,  0.0,
    1.0,  1.0,  0.0,
  ]);
  
  return GLUtil.createVertexBuffer(numComponents, data);
}

function createParticlePointUVs(numPoints) {
  const width = SIMULATION_DIM;
  const height = SIMULATION_DIM;
  
  // create two uv lookups, one for each vertex for line-drawn particles
  var buffer = [];
  for (var y=0; y<height; ++y) {
    for (var x=0; x<width; ++x) {
      for (var n = 0; n < numPoints; n++) {
        // centerpoint first vertex of the line
        buffer.push(x/width);
        buffer.push(y/height);
      }
    }
  }
  
  const numComponents = 2;
  const data = new Float32Array(buffer);

  return GLUtil.createVertexBuffer(numComponents, data);
}

function createShapeVertices(vertexPairs) {
  const width = SIMULATION_DIM;
  const height = SIMULATION_DIM;

  // create two x vertices for each particle, one for the beginning and one for the end of each line-drawn particle
  var buffer = [];
  for (var y = 0; y < height; ++y) {
    for (var x = 0; x < width; ++x) {
      for (var v = 0; v < vertexPairs.length; v++) {
        buffer.push(vertexPairs[v]);
      }
    }
  }
  
  const numComponents = 2;
  const data = new Float32Array(buffer);
  return GLUtil.createVertexBuffer(numComponents, data);
  
}


function createParticleUV() {
  const width = SIMULATION_DIM;
  const height = SIMULATION_DIM;

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


class Simulation {
  
  constructor(simulation_shader) {
    this.gl = GLUtil.gl();

    this.fullScreenQuadPos = createFullScreenQuadVertexBuffer();

    this.triBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
         0,  1/2,
       3/5, -1/2,
      -3/5, -1/2
    ]));

    this.quadStripBuffer = GLUtil.createVertexBuffer(2, new Float32Array([
      -1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
       1.0, -1.0
    ]));

    // used for points
    this.particleUV = createParticleUV();

    this.particleVerts = createShapeVertices([-1, 0, 1, 0]); // horizontal line
    this.particleLineUV = createParticlePointUVs(2);
    
    this.particleTris = createShapeVertices([0, 1/2,  3/5, -1/2,  -3/5, -1/2]);
    this.particleTriUV = createParticlePointUVs(3);

    this.particleQuads = createShapeVertices([1, 1,  1, -1,  -1, -1,  -1, 1]);
    this.particleQuadUV = createParticlePointUVs(4);

    // this.particleHexes = createShapeVertices([1, 0,  0.5, -4/5,  -0.5, -4/5,  -1, 0,  -0.5, 4/5,  0.5, 4/5]);
    // this.particleHexUV = createParticlePointUVs(6);

    this.simulation_shader = simulation_shader;

    this.current = undefined;
    this.previous = undefined;
    this.num_particles = 0;
    this.params = {};

    this.SIMULATION_DIM = SIMULATION_DIM;
    
    // initBuffers - for simulation - create textures, create framebuffer, bind textures to framebuffer, setup gl_FragData outputs for simulation shader
    this.initBuffers();
  }
  
  isInitialized() {
    return (this.current && this.previous);
  }
  
  dataBufferCount() {
    return this.simulation_shader.dataBufferCount;
  }
  
  initBuffers() {

    var gl = this.gl;
    var draw_buffers_ext = GLUtil.extensions().WEBGL_draw_buffers;
    
    var w, h; w = h = SIMULATION_DIM;

    var size = w * h * 4;
    var src_buffer = new Float32Array(size);
    for (var i = 0; i < size; i++) {
      src_buffer[i] = 0;
    }
    // initialize last and next simulation buffers
    for (var sim_buffer_idx = 0; sim_buffer_idx < 2; sim_buffer_idx++) {
      if (this.current && this.previous) {
        throw("simulation already initialized");
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

      this.color_attachments = color_attachments;

      for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
        var tx = state.textures[tx_idx];
        gl.framebufferTexture2D(gl.FRAMEBUFFER, color_attachments[tx_idx], gl.TEXTURE_2D, tx, 0);
      }
      
      // attach textures to gl_FragData[] outputs
      draw_buffers_ext.drawBuffersWEBGL(this.color_attachments);
      
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

      if (this.current) {
        this.previous = state;
      } else {
        this.current = state;
      } 
    }
  }
  
  simulate(time) {
    
    var gl = this.gl;

    // write the output of the simulation to the current framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.current.frame_buffer);

    var draw_buffers_ext = GLUtil.extensions().WEBGL_draw_buffers;
    draw_buffers_ext.drawBuffersWEBGL(this.color_attachments);

    gl.viewport(0, 0, SIMULATION_DIM, SIMULATION_DIM);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);  // so alpha output color draws correctly

    // make sure no DEPTH_TEST
    gl.disable(gl.DEPTH_TEST);

    var shader = this.simulation_shader;
    gl.useProgram(shader.program);

    // send vertex information to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullScreenQuadPos.buffer);
    gl.enableVertexAttribArray(shader.attributes.aPosition.location);
    gl.vertexAttribPointer(
      shader.attributes.aPosition.location, // index of target attribute in the buffer bound to gl.ARRAY_BUFFER
      this.fullScreenQuadPos.numComponents, // number of components per attribute
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
      SIMULATION_DIM, // width
      SIMULATION_DIM  // height
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
    gl.drawArrays(gl.TRIANGLES, 0, this.fullScreenQuadPos.count);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aPosition.location);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  swapBuffers() {
    if (this.isInitialized()) {
      var temp = this.current;
      this.current = this.previous;
      this.previous = temp;
    } else {
      console.error("simulation not yet initialized")
    }
  }
  
  update() {
    
  }

  loadParticleOntoGPU(txArr) {
    const shortBuf = new Float32Array(4 * 4);
    var gl = this.gl;

    const sim_width = SIMULATION_DIM;
    const sim_height = SIMULATION_DIM;
      
    for (var tx_idx = 0; tx_idx < this.dataBufferCount(); tx_idx++) {
      var tx = this.previous.textures[tx_idx];
      var aux_fb = this.previous.aux_frame_buffers[tx_idx];
  
      gl.bindFramebuffer(gl.FRAMEBUFFER, aux_fb);

      var sim_x = this.num_particles % sim_width;
      var sim_y = Math.floor(this.num_particles / sim_width);
      if (sim_x == 0 && sim_y == SIMULATION_DIM) {
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

module.exports = Simulation;