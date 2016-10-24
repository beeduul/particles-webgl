"use strict";

class VCR {
  constructor() {
    this._recording = false;
    this.clear();
  }
  
  clear() {
    this._head = 0;
    this._events = [];

    this._nowTime = 0;
    this._duration = 0;
    
    console.log("clear");
  }

  play(deltaTime, graphics) {
    
    if (this.recording) {

      this._nowTime += deltaTime;

    } else if (this._events.length > 0) {

      var event = this._events[this._head];

      var endTime = this._nowTime + deltaTime;
      while(event.ts < endTime) {
        graphics.addParticlesAt(event.pos, event.rgb);

        this._head++;
        if (this._head == this._events.length) {
          this._head = 0;
          endTime -= this._duration;
        }

        event = this._events[this._head];
      }

      this._nowTime = endTime;

    }

  }

  get head() {
    return this._head;
  }

  get recording() {
    return this._recording;
  }

  set recording(bool) {

    if (this._recording == bool) {
      return;
    }

    if (this._recording) {

      this._duration = this._nowTime; // mark session completion time
      this._head = 0;
      this._nowTime = 0;

    } else {

      this.clear(); // prepare for next session

    }

    this._recording = !!bool;

    if (this._recording) {
      console.log("recording start");
    } else {
      console.log("recording end, ", this._events.length, "events", this._duration, "milliseconds")
    }

  }

  recordEvent(pos, rgb) {
    if (this._recording) {
      console.log("recordEvent", this._nowTime);
      this._events.push({ ts: this._nowTime, pos: pos, rgb: rgb });
    }
  }

  info() {
    console.info(this._events.length, "events, playback head at", this.head);
  }
}

module.exports = VCR;