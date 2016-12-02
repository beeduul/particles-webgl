// attribute vec2 vertexPosition;
attribute vec2 aUV;
attribute vec2 aVert;
varying vec2 vUV;
varying vec3 color3;

uniform float nowTime;
uniform float maxLifeTime;
uniform float deltaTime;
uniform vec2 canvasSize;

uniform sampler2D uTexture0; // x, y, dx, dy
uniform sampler2D uTexture1; // accel x, accel y, decay, sz
uniform sampler2D uTexture2; // birth r, g, b, time
uniform sampler2D uTexture3; // death r, g, b, time
uniform sampler2D uTexture4; // sz, pulse, n/a, n/a
uniform sampler2D uTexture5; // rot, rotVel, rotAccel, n/a

void main() {
  vec4 pdata0 = texture2D(uTexture0, aUV);
  // vec4 pdata1 = texture2D(uTexture1, aUV);
  vec4 pdata2 = texture2D(uTexture2, aUV);
  vec4 pdata3 = texture2D(uTexture3, aUV);
  vec4 pdata4 = texture2D(uTexture4, aUV);
  vec4 pdata5 = texture2D(uTexture5, aUV);

  float size = pdata4.x;
  float pulseFreq = pdata4.y;

  float birth = pdata2.w;
  float death = pdata3.w;

  float oldest = nowTime - maxLifeTime;

  if (birth == 0.0 || death > 0.0 && nowTime > death) {
  } else {

    float lifetime = death - birth;
    float age = nowTime - birth;
    float age_t = age / lifetime;

    const float fade_t = 0.2; // gt 0 && lt .5
    if (age_t < fade_t) {
      size *= age_t / fade_t;
    } else
    if (age_t > (1.0 - fade_t)) {
      size *= (1.0 - age_t) / fade_t;
    }

    const float TWO_PI = 6.28318530717959;

    size *= ((cos(pulseFreq * TWO_PI * age / 1000.0 )) + 1.0) / 2.0;

    vec3 birthCol = pdata2.rgb;
    vec3 deathCol = pdata3.rgb;
    color3 = mix(birthCol, deathCol, age_t);
  }

  float r = pdata5.x;
  
  vec2 pos = pdata0.xy;
  
  float x = pos.x + (aVert.x * cos(r) - aVert.y * sin(r)) * size / canvasSize.x;
  float y = pos.y + (aVert.x * sin(r) + aVert.y * cos(r)) * size / canvasSize.y;
  float z = (birth - oldest) / maxLifeTime;
  gl_Position = vec4(x, y, z, 1.0);

  vUV = aUV;
}
