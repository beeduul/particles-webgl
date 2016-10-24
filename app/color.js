"use strict";

class Color {
  static createHSV(hsv) {
    var min_s = 0.75;
    var min_v = 0.75;

    var h = hsv && hsv.hasOwnProperty('h') ? hsv.h : Math.random() * 360; // any hue
    var s = hsv && hsv.hasOwnProperty('s') ? hsv.s : Math.random() * (1 - min_s) + min_s;
    var v = hsv && hsv.hasOwnProperty('v') ? hsv.v : Math.random() * (1 - min_v) + min_v;
    
    return [h, s, v];
  }

  static hsvToRgb(hsv) {
    
    var h = hsv[0];
    var s = hsv[1];
    var v = hsv[2];
    
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;

    while (h < 0) h += 360;
    while (h >= 360) h -= 360;

    var r, g, b;
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    } else {
      throw "invalid h value: " + h;
    }
    
    return [r + m, g + m, b + m];
  }
}

module.exports = Color;
