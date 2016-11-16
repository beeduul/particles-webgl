#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUV;
varying vec3 color3;

uniform float nowTime;
uniform float deltaTime;

uniform sampler2D uTexture0; // x, y, dx, dy
uniform sampler2D uTexture1; // accel x, accel y, decay, sz
uniform sampler2D uTexture2; // birth r, g, b, time
uniform sampler2D uTexture3; // death r, g, b, time
uniform sampler2D uTexture4; // sz, pulse, n/a, n/a
uniform sampler2D uTexture5; // rot, rotVel, rotAccel, n/a

void main() {
  // vec4 pdata0 = texture2D(uTexture0, vUV);
  // vec4 pdata1 = texture2D(uTexture1, vUV);
  vec4 pdata2 = texture2D(uTexture2, vUV);
  vec4 pdata3 = texture2D(uTexture3, vUV);

  float birth = pdata2.w;
  float death = pdata3.w;

  if (birth == 0.0 || death > 0.0 && nowTime > death) {
    discard;
  }

  // solid
  gl_FragColor = vec4(color3, 1.0);
}
