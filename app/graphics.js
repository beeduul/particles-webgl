"use strict";

var NUM_TEXTURES = 4;
var SIMULATION_DIM = 128;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

var Graphics = {

  gl: null,
  canvas: null,
  width: undefined,
  height: undefined,
  webgl_extensions: {},
  
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
    particle: {
      attributes: {
        aUV: {},
      },
      uniforms: {
        deltaTime:    {},
        nowTime:      {},

        uTexture0:    {},
        uTexture1:    {},
        uTexture2:    {},
        uTexture3:    {},
      }
    },
    particle_sim: {
      attributes: {
        aPosition: {},
      },
      uniforms: {
        uResolution:  { value: [SIMULATION_DIM, SIMULATION_DIM] },
        deltaTime:    {},
        nowTime:      {},
        
        uTexture0:    {},
        uTexture1:    {},
        uTexture2:    {},
        uTexture3:    {}
      },
      params: {
        gravityType:  { ui: 'checkbox', type: 'i', value: 0 }, // 0: point, 1: vector
        gravityVal:   { ui: 'range', value: [0,-0.1,0] },
        friction:     { ui: 'range', default: 0.999, value: 0.999, min: 0, max: 1 }
      }
    }
  },
  
  vertexBuffers: {
    particleUV: {
      size: 2,
      count: 3,
      data: undefined, // new Float32Array([
//           1.0, 0.0,
//           0.0, 1.0,
//           0.0, 0.0,
//         ])
    },
    fullScreenQuadPos: {
      size: 3,
      count: 6,
      data: new Float32Array([
       -1.0, -1.0,  0.0,
        1.0,  1.0,  0.0,
       -1.0,  1.0,  0.0,
       -1.0, -1.0,  0.0,
        1.0, -1.0,  0.0,
        1.0,  1.0,  0.0,
      ])
    }
  },
  
  simulation: {
    current: undefined,
    previous: undefined,
    num_particles: 0,

    params: {
      colorNoise: {
        default: 0.1,
        min: 0,
        max: 0.5
      },
      positionalNoise: {
        default: 0, // percent of screen
        min: 0,
        max: 0.5
      },
      directionalNoise: {
        default: 0,
        min: 0,
        max: 0.1
      },
      particleSize: {
        default: 3.0,
        min: 1,
        max: 50
      },
      particleLifetime: {
        default: 10000, // ms
        min: 500,
        max: 60000
      },
      particleDensity: {
        default: 100,
        min: 10,
        max: 1000
      }
    },
    
    isInitialized: function() {
      return (this.current && this.previous);
    },
    
    swapBuffers: function() {
      if (this.isInitialized()) {
        var temp = this.current;
        this.current = this.previous;
        this.previous = temp;
      } else {
        console.error("simulation not yet initialized")
      }
    },
    
  },

  generateParticleVertexData: function() {
    var width = SIMULATION_DIM;
    var height = SIMULATION_DIM;

    this.vertexBuffers.particleUV.size = 2;
    this.vertexBuffers.particleUV.count = width * height;

    var uvArray = [];
    for (var y=0; y<height; ++y) {
      for (var x=0; x<width; ++x) {
        uvArray.push(x/width);
        uvArray.push(y/height);
      }
    }

    var data = new Float32Array(uvArray);
    this.vertexBuffers.particleUV.data = data;
  },

  initShaders: function() {
    for (var shader in this.shaders) {
      var vertex_shader_script_id = shader + "_vs";
      var fragment_shader_script_id = shader + "_fs";
      initShader(this.gl, this.shaders[shader], vertex_shader_script_id, fragment_shader_script_id);
    }
  },
  
  initBuffers: function() {
    for (var vbName in this.vertexBuffers) {
      this.prepareVertexBuffer(this.vertexBuffers[vbName]);
    }
  },
  
  prepareVertexBuffer: function(vb) {
    var gl = this.gl;
    vb.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vb.data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  },
  
  init: function(canvas) {
    // init canvas
    this.canvas = canvas;
    this.onWindowResize();

    this.lastEvent = null;

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
    })(this);

    // init gl
    this.gl = initWebGL(canvas);
    this.setupGL();

    this.generateParticleVertexData();

    // init shaders
    this.initShaders();
    this.initBuffers();
    
    // init fbos

    // initSimulationBuffers - for simulation - create textures, create framebuffer, bind textures to framebuffer, setup gl_FragData outputs for simulation shader
    this.initSimulationBuffers();

    // set resolution uniform for compute shader programs
    // drawParticleInit - bind framebuffer, setup viewport, clear, use sim shader, enableVertexAttribArray, bind array buffer, vertexAttribPointer, drawArrays (one big quad), cleanup

  },

  handleMouseEvent: function(event) {
    if (event.type == "mousedown") {
      // event.preventDefault();
      this.rgb = [Math.random(), Math.random(), Math.random()]
      this.addParticlesAt(event.x, event.y, this.rgb);
    } else if (event.type == "mousemove") {
      // event.preventDefault();
      if (this.rgb) {
        this.addParticlesAt(event.x, event.y, this.rgb);
      }
    } else if (event.type == "mouseup") {
      this.rgb = null;
      this.lastEvent = null;
    }
  },

  getSimulationParam: function(name) {
    if (this.simulation.params[name]) {
      return this.simulation.params[name];
    } else {
      return this.shaders.particle_sim.params[name];
    }
  },
  
  getSimulationValue: function(name) {
    var param = this.getSimulationParam(name);
    return param.value || param.default;
  },
  
  setSimulationValue: function(name, value) {
    this.getSimulationParam(name).value = value;
  },
  
  addParticlesAt: function(px, py, rgb) {
    var gl = this.gl;
    
    var sim_width, sim_height; sim_width = sim_height = SIMULATION_DIM;
    var shortBuf = new Float32Array(4 * 4);
  
    var birthCol = [];
    var numToAdd = Math.floor(this.getSimulationValue('particleDensity') / this.deltaTime) + 1;
    
    for (var p = 0; p < numToAdd; p++) {
      var t = p / numToAdd;
      var num_particles = this.simulation.num_particles;
      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
        var tx = this.simulation.previous.textures[tx_idx];
        var aux_fb = this.simulation.previous.aux_frame_buffers[tx_idx];
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, aux_fb);

        var sim_x = num_particles % sim_width;
        var sim_y = Math.floor(num_particles / sim_width);
        if (sim_x == 0 && sim_y == SIMULATION_DIM) {
          sim_y = 0;
        }

        var spaceAvailable = sim_width - sim_x;

        var base_index = num_particles * 4;

        switch(tx_idx) {
        case 0:
          var x = px;
          var y = px;
          if (this.lastEvent) {
            x = px - (px - this.lastEvent.x) * t;
            y = py - (py - this.lastEvent.y) * t;
          }
          // particle position - x, y, z
          var positionalNoise = this.getSimulationValue('positionalNoise');
          shortBuf[0] = (x / this.width) * 2.0 - 1.0 + (2 * Math.random() - 1) * positionalNoise;
          shortBuf[1] = (y / this.height) * -2.0 + 1.0 + (2 * Math.random() - 1) * positionalNoise;
          shortBuf[2] = 0.0;
          shortBuf[3] = 0.0;
          break;

        case 1:
          // birth particle color:  r, g, b
          var colorNoise = this.getSimulationValue('colorNoise');
          shortBuf[0] = birthCol[0] = clamp(rgb[0] + (2 * Math.random() - 1) * colorNoise, 0, 1);
          shortBuf[1] = birthCol[1] = clamp(rgb[1] + (2 * Math.random() - 1) * colorNoise, 0, 1);
          shortBuf[2] = birthCol[2] = clamp(rgb[2] + (2 * Math.random() - 1) * colorNoise, 0, 1);

          // birth time
          shortBuf[3] = this.nowTime;

          break;

        case 2:
          // dx, dy, dz, sz (particle size)
          var dx = 0;
          var dy = 0;
          var dz = 0;
          if (this.lastEvent) {
            dx = (px - this.lastEvent.x) / this.width;
            dy = (this.lastEvent.y - py) / this.height;
          }
        
          var directionalNoise = this.getSimulationValue('directionalNoise');
          shortBuf[0] = dx + (2 * Math.random() - 1) * directionalNoise;
          shortBuf[1] = dy + (2 * Math.random() - 1) * directionalNoise;
          shortBuf[2] = dz + (2 * Math.random() - 1) * directionalNoise;

          shortBuf[3] = this.getSimulationValue('particleSize');
          break;

        case 3:
          // death particle color:  r, g, b
          shortBuf[0] = clamp(1.0 - birthCol[0] + (2 * Math.random() - 1) * this.getSimulationValue('colorNoise'), 0, 1);
          shortBuf[1] = clamp(1.0 - birthCol[1] + (2 * Math.random() - 1) * this.getSimulationValue('colorNoise'), 0, 1);
          shortBuf[2] = clamp(1.0 - birthCol[2] + (2 * Math.random() - 1) * this.getSimulationValue('colorNoise'), 0, 1);

          // death time
          shortBuf[3] = this.nowTime + this.getSimulationValue('particleLifetime'); // ms
          break;
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
  
      this.simulation.num_particles += 1;
      if (this.simulation.num_particles > sim_width * sim_height) {
        this.simulation.num_particles = 0;
      }
      
    }
    
    this.lastEvent = { x: px, y: py };
  },

  update: function(nowTime, deltaTime) {
    this.nowTime = nowTime;
    this.deltaTime = deltaTime;

    this.simulate();
    
    this.draw();

    // swap simulation buffers
    this.simulation.swapBuffers();
  },
  
  initSimulationBuffers: function() {
    var draw_buffers_ext = this.webgl_extensions.draw_buffers_ext;
    var gl = this.gl;
    
    var w, h; w = h = SIMULATION_DIM;

    var size = w * h * 4;
    var src_buffer = new Float32Array(size);
    for (var i = 0; i < size; i++) {
      src_buffer[i] = 0;
    }
    
    // initialize last and next simulation buffers
    for (var sim_buffer_idx = 0; sim_buffer_idx < 2; sim_buffer_idx++) {
      
      if (this.simulation.current && this.simulation.previous) {
        throw("simulation already initialized");
      }
      
      console.log("Configuring " + (!this.simulation.current ? "current" : "efe") + " simulation_buffer");
      
      var state = {
        frame_buffer: gl.createFramebuffer(),
        aux_frame_buffers: [],
        textures: []
      }

      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
        var tx = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tx);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, src_buffer);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);
        src_buffer = undefined;
        
        console.log("Created Texture " + tx_idx);
        state.textures[tx_idx] = (tx);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, state.frame_buffer);
      var color_attachments = [];
      for (var color_attachment_idx = 0; color_attachment_idx < NUM_TEXTURES; color_attachment_idx++) {
        color_attachments[color_attachment_idx] = (draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL + color_attachment_idx); // gl_FragData[color_attachment_idx]
      }
      this.simulation.color_attachments = color_attachments;
      
      console.log("color_attachments: ", color_attachments);

      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
        var tx = state.textures[tx_idx];
        gl.framebufferTexture2D(gl.FRAMEBUFFER, color_attachments[tx_idx], gl.TEXTURE_2D, tx, 0);
        console.log("framebufferTexture2D for color_attachment", color_attachments[tx_idx], ", tx: ", tx);
      }

      // attach textures to gl_FragData[] outputs
      draw_buffers_ext.drawBuffersWEBGL(this.simulation.color_attachments);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Can't use main framebuffer.");
        // See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
      }
      if (!gl.isFramebuffer(state.frame_buffer)) {
        console.error("Frame buffer failed");
      }
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      
      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
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


      if (this.simulation.current) {
        this.simulation.previous = state;
      } else {
        this.simulation.current = state;
      }

    }
    
  },
  
  simulate: function() {
    
    var gl = this.gl;

    // write the output of the simulation to the current framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simulation.current.frame_buffer);

    var draw_buffers_ext = this.webgl_extensions.draw_buffers_ext;
    draw_buffers_ext.drawBuffersWEBGL(this.simulation.color_attachments);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);  // so alpha output color draws correctly

    // make sure no DEPTH_TEST
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    var shader = this.shaders.particle_sim;
    gl.useProgram(shader.program);

    // send vertex information to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.fullScreenQuadPos.buffer);
    gl.enableVertexAttribArray(shader.attributes.aPosition.location);
    gl.vertexAttribPointer(
      shader.attributes.aPosition.location, // index of target attribute in the buffer bound to gl.ARRAY_BUFFER
      this.vertexBuffers.fullScreenQuadPos.size, // number of components per attribute
      gl.FLOAT, false, 0, 0);  // type, normalized, stride, offset

    // update shader uniforms

    // enable texture samplers in shader
    for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
      gl.activeTexture(gl.TEXTURE0 + tx_idx);
      gl.bindTexture(gl.TEXTURE_2D, this.simulation.previous.textures[tx_idx]);
      gl.uniform1i(shader.uniforms["uTexture" + tx_idx].location, tx_idx);
    }

    gl.uniform1f(shader.uniforms.nowTime.location, this.nowTime);
    gl.uniform1f(shader.uniforms.deltaTime.location, this.deltaTime);

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
        
    gl.uniform1i(shader.params.gravityType.location, shader.params.gravityType.value);

    gl.uniform2f(shader.uniforms.uResolution.location,
      shader.uniforms.uResolution.value[0],
      shader.uniforms.uResolution.value[1]
    );

    // 'draw' the simulation
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexBuffers.fullScreenQuadPos.count);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aPosition.location);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  },
  
  draw: function() {
    var gl = this.gl;
    
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // make sure DEPTH_TEST is on
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var shader = this.shaders.particle;
    gl.useProgram(shader.program);

    // bind the particleUV vertex buffer to GPU
    gl.enableVertexAttribArray(shader.attributes.aUV.location);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.particleUV.buffer);
    gl.vertexAttribPointer(
      shader.attributes.aUV.location,
      this.vertexBuffers.particleUV.size, gl.FLOAT, false, 0, 0);      

    gl.uniform1f(shader.uniforms.nowTime.location, this.nowTime);
    gl.uniform1f(shader.uniforms.deltaTime.location, this.deltaTime);


    for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
      gl.activeTexture(gl.TEXTURE0 + tx_idx);
      gl.bindTexture(gl.TEXTURE_2D, this.simulation.previous.textures[tx_idx]);
      gl.uniform1i(shader.uniforms["uTexture" + tx_idx].location, tx_idx);
    }

    gl.drawArrays(gl.POINTS, 0, this.vertexBuffers.particleUV.count);
    
    // gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aUV.location);
    gl.useProgram(null);
    // gl.disable(gl.BLEND);
  },

  setupGL: function() {
    var gl = this.gl;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(100000.0);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.depthFunc(gl.LEQUAL);
    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var available_extensions = gl.getSupportedExtensions();
    console.log(available_extensions);

    var float_textures_ext = gl.getExtension("OES_texture_float");
    console.log("float_textures_ext: ", float_textures_ext);

    var draw_buffers_ext = gl.getExtension("WEBGL_draw_buffers");
    var maxDrawingBuffers = gl.getParameter(draw_buffers_ext.MAX_DRAW_BUFFERS_WEBGL);
    var maxColorAttachments = gl.getParameter(draw_buffers_ext.MAX_COLOR_ATTACHMENTS_WEBGL);
    var maxUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    var maxUsable = Math.min(maxDrawingBuffers, maxColorAttachments, maxUniformVectors);

    console.log("draw_buffers_ext: ", draw_buffers_ext);
    console.log("maxDrawingBuffers: ", maxDrawingBuffers);
    console.log("maxColorAttachments:", maxColorAttachments);
    console.log("maxUniformVectors:", maxUniformVectors);
    console.log("maxUsable:", maxUsable);

    this.webgl_extensions.draw_buffers_ext = draw_buffers_ext;
  },

  onWindowResize: function() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // this.camera.aspect = this.width/this.height;
  },

  

};

function initShader(gl, shader, vertex_shader_script_id, fragment_shader_script_id)
{
  shader.program = createProgramFromScripts(
    gl,
    vertex_shader_script_id, fragment_shader_script_id);
  console.log("initShader (vertex_shader_script_id:", vertex_shader_script_id, ", fragment_shader_script_id: ", fragment_shader_script_id, "), shader: ", shader);
 
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
function compileShader(gl, scriptId, shaderSource, shaderType) {
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
    throw "could not compile shader (" + scriptId + "):" + gl.getShaderInfoLog(shader);
  }

  return shader;
}
 
/**
* Creates a shader from the content of a script tag.
*
* @param {!WebGLRenderingContext} gl The WebGL Context.
* @param {string} scriptId The id of the script tag.
* @param {string} opt_shaderType. The type of shader to create.
*     If not passed in will use the type attribute from the
*     script tag.
* @return {!WebGLShader} A shader.
*/
function createShaderFromScript(gl, scriptId, opt_shaderType) {
  // look up the script tag by id.
  var shaderScript = document.getElementById(scriptId);
  if (!shaderScript) {
    throw("*** Error: unknown script element" + scriptId);
  }

  // extract the contents of the script tag.
  var shaderSource = shaderScript.text;

  // If we didn't pass in a type, use the 'type' from
  // the script tag.
  if (!opt_shaderType) {
    if (shaderScript.type == "x-shader/x-vertex") {
      opt_shaderType = gl.VERTEX_SHADER;
    } else if (shaderScript.type == "x-shader/x-fragment") {
      opt_shaderType = gl.FRAGMENT_SHADER;
    } else if (!opt_shaderType) {
      throw("*** Error: shader type not set");
    }
  }

  return compileShader(gl, scriptId, shaderSource, opt_shaderType);
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
function createProgramFromScripts(gl, vertexShaderId, fragmentShaderId) {
  var vertexShader = createShaderFromScript(gl, vertexShaderId);
  var fragmentShader = createShaderFromScript(gl, fragmentShaderId);
  return createProgram(gl, vertexShader, fragmentShader);
}

function initWebGL(canvas) {
  var gl = null;

  try {
  // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  catch(e) {}

  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    gl = null;
  }

  return gl;
}

module.exports = Graphics;
