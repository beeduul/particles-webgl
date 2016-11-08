#extension GL_EXT_draw_buffers : require
precision mediump float;

uniform vec2 uResolution;
uniform float nowTime;
uniform float deltaTime;

uniform sampler2D uTexture0; // x, y, dx, dy
uniform sampler2D uTexture1; // accel x, accel y, decay, sz
uniform sampler2D uTexture2; // birth r, g, b, time
uniform sampler2D uTexture3; // death r, g, b, time
uniform sampler2D uTexture4; // sz, pulse, n/a, n/a
uniform sampler2D uTexture5; // rot, rotVel, rotAccel, n/a

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;

  vec4 pdata0 = texture2D(uTexture0, uv);
  vec4 pdata1 = texture2D(uTexture1, uv);
  vec4 pdata2 = texture2D(uTexture2, uv);
  vec4 pdata3 = texture2D(uTexture3, uv);
  vec4 pdata4 = texture2D(uTexture4, uv);
  vec4 pdata5 = texture2D(uTexture5, uv);

  float birth = pdata2.w;
  float death = pdata3.w;

  if (birth == 0.0 || death > 0.0 && nowTime > death) {
    gl_FragData[0] = vec4(0.0);
    gl_FragData[1] = vec4(0.0);
    gl_FragData[2] = vec4(0.0);
    gl_FragData[3] = vec4(0.0);
    gl_FragData[4] = vec4(0.0);
    gl_FragData[5] = vec4(0.0);
  } else {

    vec2 pos = pdata0.xy;
    vec2 velocity = pdata0.zw;

    float lifetime = death - birth;
    float age = nowTime - birth;
    float age_t = age / lifetime;
    float size = pdata4.x;

    vec2 accel = pdata1.xy;
    float decay = pdata1.z;
    pos += velocity * deltaTime / 1000.0;
    velocity *= decay * deltaTime / 1000.0;
    velocity += accel * deltaTime / 1000.0;
    accel *= decay;

    gl_FragData[0] = vec4(pos, velocity);
    gl_FragData[1] = vec4(accel, pdata1.zw);
    gl_FragData[2] = pdata2;
    gl_FragData[3] = pdata3;
    gl_FragData[4] = pdata4;
  }
}
