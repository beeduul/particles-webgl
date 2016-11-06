#ifdef GL_ES
precision highp float;
#endif

varying vec3 v3xyz;
varying vec2 vUV;

uniform float nowTime;
uniform float deltaTime;

uniform sampler2D uTexture0; // x, y, dx, dy
uniform sampler2D uTexture1; // accel x, accel y, decay, sz
uniform sampler2D uTexture2; // birth r, g, b, time
uniform sampler2D uTexture3; // death r, g, b, time
uniform sampler2D uTexture4; // sz, pulse, n/a, n/a

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

  float lifetime = death - birth;
  float age = nowTime - birth;

  float age_t = age / lifetime;
  vec3 birthCol = pdata2.rgb;
  vec3 deathCol = pdata3.rgb;

  // // circle
  // {
  //   float x = 2.0 * (gl_PointCoord[0] - 0.5);
  //   float y = 2.0 * (gl_PointCoord[1] - 0.5);
  //   float d = x * x + y * y;
  //
  //   // hollow
  //   // if (d > 1.0 || d < 0.9) {
  //   //   discard;
  //   // }
  //
  //   // filled
  //   if (d > 1.0) {
  //     discard;
  //   }
  // }

  // square
  {
    // float thickness = 0.05;
    // if (gl_PointCoord[0] > thickness && gl_PointCoord[0] < 1.0 - thickness &&
    //     gl_PointCoord[1] > thickness && gl_PointCoord[1] < 1.0 - thickness) {
    //   discard;
    // }
  }

  // solid
  {
    gl_FragColor = vec4(mix(birthCol, deathCol, age_t), 1.0);
  }

  // fakeshaded
  {
    // float shadeAlpha = gl_PointCoord[0]; // left

    // float shadeAlpha = (gl_PointCoord[0] + gl_PointCoord[1]) / 2.0; // upper left
    // gl_FragColor = vec4(mix(birthCol, deathCol, age_t) * shadeAlpha, 1.0);
  }
}
