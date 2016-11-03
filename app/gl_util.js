"use strict";

var _gl;
var _extensions = {};

class VertexBuffer {
  constructor(gl, numComponents, data) {
    this._buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this._numComponents = numComponents;
    this._count = data.length / numComponents;
  }

  get buffer() {
    return this._buffer;
  }
  
  get numComponents() {
    return this._numComponents;
  }
  
  get count() {
    return this._count;
  }
};

class GLUtil {
  
  static gl() {
    return _gl;
  }
  static extensions() {
    return _extensions;
  }

  static createVertexBuffer(numComponents, count, data) {
    return new VertexBuffer(_gl, numComponents, count, data);
  }
  
  static initWebGL(canvas) {
    var gl = null;

    try {
    // Try to grab the standard context. If it fails, fallback to experimental.
      var contextAttributes = {antialias: false};
      gl = canvas.getContext("webgl", contextAttributes);
      
      gl = WebGLDebugUtils.makeDebugContext(gl);
      
      if (gl) {
        console.log("webgl context creation succeeded with contextAttributes ", contextAttributes);
      } else {
        console.log("webgl context creation failed, falling back to experimental-webgl");
        canvas.getContext("experimental-webgl", contextAttributes);
      }
    }
    catch(e) {}

    // If we don't have a GL context, give up now
    if (!gl) {
      alert("Unable to initialize WebGL. Your browser may not support it.");
      gl = null;
    }

    return gl;
  }

  static setupGL(canvas, requested_extensions) {
    
    if (_gl) {
      throw "gl already initialized";
    }
    
    var gl = _gl = GLUtil.initWebGL(canvas);
    
    gl.viewport(0, 0, canvas.width, canvas.height);
  
    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(0);
    // gl.depthMask(true);
    // gl.depthRange(0, 1);
    gl.disable(gl.DEPTH_TEST);

    // Clear the color as well as the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var available_extensions = gl.getSupportedExtensions();
    console.log(available_extensions);

    for (let ext of requested_extensions) {
      
      if (!available_extensions.includes(ext)) {
        throw "unsupported webgl extension " + ext;
      }
      
      _extensions[ext] = gl.getExtension(ext);
      console.log("requested", ext, ", got", _extensions[ext]);
    }

    var draw_buffers_ext = _extensions["WEBGL_draw_buffers"];
    var maxDrawingBuffers = gl.getParameter(draw_buffers_ext.MAX_DRAW_BUFFERS_WEBGL);
    var maxColorAttachments = gl.getParameter(draw_buffers_ext.MAX_COLOR_ATTACHMENTS_WEBGL);
    var maxUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    var maxUsable = Math.min(maxDrawingBuffers, maxColorAttachments, maxUniformVectors);
    
    console.log("draw_buffers_ext: ", draw_buffers_ext);
    console.log("maxDrawingBuffers: ", maxDrawingBuffers);
    console.log("maxColorAttachments:", maxColorAttachments);
    console.log("maxUniformVectors:", maxUniformVectors);
    console.log("maxUsable:", maxUsable);
  }
}

module.exports = GLUtil;