"use strict";

var NUM_TEXTURES = 2;
var SIMULATION_DIM = 100;

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
    SIMULATION_DIM: 100,
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
    var width = this.simulation.SIMULATION_DIM;
    var height = this.simulation.SIMULATION_DIM;

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

    this.event = null;

    canvas.addEventListener("mousedown", function(event) {
      this.event = event;
    }.bind(this));

    canvas.addEventListener("mousemove", function(event) {
      this.event = event;
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

  update: function(delta_time) {
    
    if (this.event) {
      console.log(this.event);
      // download particle data from previous buffer
      var gl = this.gl;
      
      var w, h; w = h = SIMULATION_DIM;
      var buffer = new Float32Array(w * h * 4);
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.simulation.previous.frame_buffer);

      var num_particles = this.simulation.num_particles;
    
      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
        var tx = this.simulation.previous.textures[tx_idx];

        // gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL + tx_idx, gl.TEXTURE_2D, tx, 0);

        gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, buffer);
      
        var base_index = num_particles * 4;

        switch(tx_idx) {
        case 0:
          // x, y, ?, size
          buffer[base_index + 0] = (this.event.x / this.width) * 2.0 - 1.0;
          buffer[base_index + 1] = (this.event.y / this.height) * -2.0 + 1.0;
          buffer[base_index + 2] = 0.0;
          buffer[base_index + 3] = 10.0; // time, not really
          break;
        case 1:
          // r, g, b, a
          buffer[base_index + 0] = 1.0; // (this.event.x / this.width);
          buffer[base_index + 1] = 1.0; // (this.event.y / this.height);
          buffer[base_index + 2] = 0.0;
          buffer[base_index + 3] = 1.0;
          break;
        }

        gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, buffer);
      }

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      this.simulation.num_particles += 1;
      
      // add new particle data at buffer_length + 1, with mouse position and other particle attributes
      // reset texture with particle data
      this.event = null;
    }
    
    this.simulate(delta_time);
    this.draw();
  },
  
  initSimulationBuffers: function() {
    var draw_buffers_ext = this.webgl_extensions.draw_buffers_ext;
    var gl = this.gl;
    
    // initialize last and next simulation buffers
    for (var sim_buffer_idx = 0; sim_buffer_idx < 2; sim_buffer_idx++) {
      
      if (this.simulation.current && this.simulation.previous) {
        throw("simulation already initialized");
      }
      
      var state = {
        frame_buffer: gl.createFramebuffer(),
        textures: []
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, state.frame_buffer);

      for (var tx_idx = 0; tx_idx < NUM_TEXTURES; tx_idx++) {
        
        var tx = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tx);
        var w, h; w = h = SIMULATION_DIM;
        
        var src_buffer = new Float32Array(w * h * 4);
        for (var y = 0; y < h; ++y) {
          for (var x = 0; x < w; ++x) {
            var idx_base = (y * w + x) * 4;
            src_buffer[idx_base + 0] = 0.0; // x
            src_buffer[idx_base + 1] = 0.0; // y
            src_buffer[idx_base + 2] = 0.0; // z
            src_buffer[idx_base + 3] = 0.0; // time
          }
        }
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, src_buffer);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL + tx_idx, gl.TEXTURE_2D, tx, 0);

        state.textures.push(tx);
      }

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.log("Can't use framebuffer.");
        // See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
      }

      if (!gl.isFramebuffer(state.frame_buffer)) {
        console.error("Frame buffer failed");
      }

      if (this.simulation.current) {
        this.simulation.previous = state;
      } else {
        this.simulation.current = state;
      }

      var color_attachments = []
      for (var color_attachment_idx = 0; color_attachment_idx < NUM_TEXTURES; color_attachment_idx++) {
        color_attachments.push(draw_buffers_ext.COLOR_ATTACHMENT0_WEBGL + color_attachment_idx); // // gl_FragData[i]
      }
      draw_buffers_ext.drawBuffersWEBGL(color_attachments);      

    }
    
  },
  
  simulate: function(delta_time) {
    
    var gl = this.gl;
    var fbo = this.simulation.current.frame_buffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

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

    // TODO make loop
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.simulation.previous.textures[0]); // necessary?
    gl.uniform1i(shader.uniforms.uTexture0.location, this.simulation.previous.textures[0]);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.simulation.previous.textures[1]); // necessary?
    gl.uniform1i(shader.uniforms.uTexture1.location, this.simulation.previous.textures[1]);
    
    gl.uniform2f(shader.uniforms.uResolution.location,
      shader.uniforms.uResolution.value[0],
      shader.uniforms.uResolution.value[1]
    );

    gl.uniform1i(shader.uniforms.uDeltaTime.location, delta_time);

    // 'draw' the simulation
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexBuffers.fullScreenQuadPos.count);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shader.attributes.aPosition.location);
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // swap simulation buffers
    this.simulation.swapBuffers();
  },
  
  draw: function() {
    var gl = this.gl;
    
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);   // additive blending
    
    gl.useProgram(this.shaders.particle.program);

    // set uniform
    var uColor = this.shaders.particle.uniforms.uColor;
    gl.uniform4f(uColor.location, uColor.value[0], uColor.value[1], uColor.value[2], uColor.value[3]);

    // bind the particleUV vertex buffer to GPU
    gl.enableVertexAttribArray(this.shaders.particle.attributes.aUV.location);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.particleUV.buffer);
    gl.vertexAttribPointer(
      this.shaders.particle.attributes.aUV.location,
      this.vertexBuffers.particleUV.size, gl.FLOAT, false, 0, 0);      

    // TODO make loop
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.simulation.current.textures[0]);
    gl.uniform1i(this.shaders.particle.uniforms.uTexture0.location, this.simulation.current.textures[0]);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.simulation.current.textures[1]);
    gl.uniform1i(this.shaders.particle.uniforms.uTexture1.location, this.simulation.current.textures[1]);

    gl.drawArrays(gl.POINTS, 0, this.vertexBuffers.particleUV.count);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(this.shaders.particle.attributes.aUV.location);
    gl.useProgram(null);
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
