/* Kleine WebAudio-geluidjes; geen externe bestanden nodig. */
(function (global) {
  'use strict';

  function Sound() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem('pacman-muted') === '1';
    } catch (e) { /* localStorage kan geblokkeerd zijn */ }
    this.wakaHigh = false;
  }

  Sound.prototype.ensure = function () {
    if (!this.ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  };

  Sound.prototype.setMuted = function (muted) {
    this.muted = muted;
    try { localStorage.setItem('pacman-muted', muted ? '1' : '0'); } catch (e) {}
  };

  Sound.prototype.blip = function (type, freqStart, freqEnd, duration, gain) {
    if (this.muted) return;
    var ctx = this.ensure();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var vol = ctx.createGain();
    osc.type = type;
    var t = ctx.currentTime;
    osc.frequency.setValueAtTime(freqStart, t);
    if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + duration);
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  };

  Sound.prototype.waka = function () {
    this.wakaHigh = !this.wakaHigh;
    this.blip('square', this.wakaHigh ? 440 : 300, this.wakaHigh ? 300 : 440, 0.07, 0.06);
  };
  Sound.prototype.power = function () {
    this.blip('sawtooth', 200, 700, 0.35, 0.07);
  };
  Sound.prototype.eatGhost = function () {
    this.blip('square', 300, 1200, 0.3, 0.08);
  };
  Sound.prototype.fruit = function () {
    this.blip('triangle', 700, 1400, 0.25, 0.09);
  };
  Sound.prototype.death = function () {
    this.blip('sawtooth', 600, 60, 1.1, 0.09);
  };
  Sound.prototype.extraLife = function () {
    this.blip('square', 800, 800, 0.12, 0.08);
    var self = this;
    setTimeout(function () { self.blip('square', 1200, 1200, 0.18, 0.08); }, 140);
  };
  Sound.prototype.levelUp = function () {
    var self = this;
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { self.blip('triangle', f, f, 0.16, 0.07); }, i * 110);
    });
  };
  Sound.prototype.start = function () {
    var self = this;
    [392, 523, 659].forEach(function (f, i) {
      setTimeout(function () { self.blip('square', f, f, 0.14, 0.06); }, i * 120);
    });
  };

  global.Sound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
