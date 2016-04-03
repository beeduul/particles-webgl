"use strict";

var NUM_TEXTURES = 4;
var SIMULATION_DIM = 128;

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
        uTexture0:    { value: null },
        uTexture1:    { value: null },
        uTexture2:    { value: null },
        uTexture3:    { value: null },
      }
    },
    particle_sim: {
      attributes: {
        aPosition: {},
      },
      uniforms: {
        uResolution: { value: [SIMULATION_DIM, SIMULATION_DIM] },
        uTexture0:   { value: null },
        uTexture1:   { value: null },
        uTexture2:   { value: null },
        uTexture3:    { value: null },
        gravityLoc:  { value: [0,0,0] },
        gravityPower: { value: 1000.0 },
        friction:    { value: 0.999 }
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
    var gl = this.gl;
  
    var w, h; w = h = SIMULATION_DIM;
    var shortBuf = new Float32Array(4 * 4);
  
    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.simulation.previous.frame_buffer);

    var num_particles = this.simulation.num_particles;

    for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
      var tx = this.simulation.previous.textures[tx_idx];
      var aux_fb = this.simulation.previous.aux_frame_buffers[tx_idx];
    
      gl.bindFramebuffer(gl.FRAMEBUFFER, aux_fb);

      // should only be required on init, not update
      // var draw_buffers_ext = this.webgl_extensions.draw_buffers_ext;
      // gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, tx, 0);

      var x = num_particles % w;
      var y = Math.floor(num_particles / w);
      if (x == 0 && y == SIMULATION_DIM) {
        y = 0;
      }
      // console.log("x: ", x, "y: ", y, "num_particles: ", num_particles, ", w: ", w, ", h: ", h);

      var spaceAvailable = w - x;
      // if (spaceAvailable < 4) {
      //   var overflow = 4 - spaceAvailable;
      //   gl.readPixels(x, y, spaceAvailable, 1, gl.RGBA, gl.FLOAT, shortBuf);
      //   var overBuf = new Float32Array(overflow * 4);
      //   var newY = (y + 1) % h;
      //   // gl.readPixels(0, newY, overflow, 1, gl.RGBA, gl.FLOAT, overBuf);
      //   for (var i = 0; i < overBuf; i++) {
      //     shortBuf[spaceAvailable + i] = overBuf[i];
      //   }
      // } else {
      //   gl.readPixels(x, y, 4, 1, gl.RGBA, gl.FLOAT, shortBuf);
      // }

      var base_index = num_particles * 4;

      switch(tx_idx) {
      case 0:
        // particle position - x, y, z, ttl
        shortBuf[0] = (event.x / this.width) * 2.0 - 1.0;
        shortBuf[1] = (event.y / this.height) * -2.0 + 1.0;
        shortBuf[2] = 0.0;
        shortBuf[3] = 10.0;
        break;
      case 1:
        // particle color:  r, g, b, a
        shortBuf[0] = (event.x / this.width);
        shortBuf[1] = (event.y / this.height);
        shortBuf[2] = 0.5;
        shortBuf[3] = 1.0;
        break;

      case 2:
        // dx, dy, dz, sz (particle size)
        var dx = 0;
        var dy = 0;
        var dz = 0;
        if (this.lastEvent) {
          dx = (event.x - this.lastEvent.x) / this.width;
          dy = (this.lastEvent.y - event.y) / this.height;
        }
        shortBuf[0] = dx;
        shortBuf[1] = dy;
        shortBuf[2] = dz;

        
        shortBuf[3] = (event.y / this.height) * 10.0; // size
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tx);

      if (spaceAvailable < 4) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, spaceAvailable, 1, gl.RGBA, gl.FLOAT, shortBuf);
        var overflow = 4 - spaceAvailable;
        var overBuf = new Float32Array(overflow * 4);
        for (var i = 0; i < overBuf; i++) {
          overBuf[i] = shortBuf[spaceAvailable + i];
        }
        var newY = (y + 1) % h;
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, newY, overflow, 1, gl.RGBA, gl.FLOAT, overBuf);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 4, 1, gl.RGBA, gl.FLOAT, shortBuf);
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
    this.simulation.num_particles += 1;
    if (this.simulation.num_particles > w * h) {
      this.simulation.num_particles = 0;
    }
    
    this.lastEvent = event;
  },

  update: function(delta_time) {
    
    this.simulate(delta_time);
    
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
  
  simulate: function(delta_time) {
    
    var gl = this.gl;

    // write the output of the simulation to the current framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simulation.current.frame_buffer);

    var draw_buffers_ext = this.webgl_extensions.draw_buffers_ext;
    draw_buffers_ext.drawBuffersWEBGL(this.simulation.color_attachments);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ZERO);  // so alpha output color draws correctly
    // make sure no DEPTH_TEST

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

    gl.uniform3f(shader.uniforms.gravityLoc.location,
      shader.uniforms.gravityLoc.value[0],
      shader.uniforms.gravityLoc.value[1],
      shader.uniforms.gravityLoc.value[2]
    );
    
    gl.uniform1f(shader.uniforms.gravityPower.location, shader.uniforms.gravityPower.value);
    gl.uniform1f(shader.uniforms.friction.location, shader.uniforms.friction.value);

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
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var shader = this.shaders.particle;
    gl.useProgram(shader.program);

    // bind the particleUV vertex buffer to GPU
    gl.enableVertexAttribArray(shader.attributes.aUV.location);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.particleUV.buffer);
    gl.vertexAttribPointer(
      shader.attributes.aUV.location,
      this.vertexBuffers.particleUV.size, gl.FLOAT, false, 0, 0);      

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
    gl.disable(gl.BLEND);
  },

  setupGL: function() {
    var gl = this.gl;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);

    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT);

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
function compileShader(gl, shaderSource, shaderType) {
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
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
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

  return compileShader(gl, shaderSource, opt_shaderType);
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