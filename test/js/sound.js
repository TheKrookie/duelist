/* Duelist · js/sound.js
   Sound effects (generated live) and vibration. */

/* =====================================================================
   SOUND (generated live, no files) + HAPTICS (Telegram first)
   ===================================================================== */
var Snd = {ctx:null, nb:null, amb:null, muted:false};
try { Snd.muted = localStorage.getItem('pd-mute') === '1'; } catch (e) {}
function ac(){
  if (Snd.muted) return null;
  if (!Snd.ctx){ try { Snd.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (Snd.ctx.state === 'suspended') Snd.ctx.resume();
  return Snd.ctx;
}
function noise(c){
  if (Snd.nb) return Snd.nb;
  var b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (Snd.nb = b);
}
function envGain(c, t0, a, peak, d){
  var g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  g.connect(c.destination);
  return g;
}
function burst(type, freq, q, a, peak, d, sweepTo, delay){
  var c = ac(); if (!c) return;
  var t0 = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter();
  s.buffer = noise(c); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + a + d);
  s.connect(f); f.connect(envGain(c, t0, a, peak, d));
  s.start(t0, Math.random()); s.stop(t0 + a + d + 0.05);
}
function tone(type, f0, f1, a, peak, d, delay){
  var c = ac(); if (!c) return;
  var t0 = c.currentTime + (delay || 0), o = c.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f0, t0);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + a + d);
  o.connect(envGain(c, t0, a, peak, d));
  o.start(t0); o.stop(t0 + a + d + 0.05);
}
var SFX = {
  whistle: function(){
    var c = ac(); if (!c) return;
    [0, 0.24].forEach(function(dl, i){
      var t0 = c.currentTime + dl, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
      o.frequency.value = 2850; lfo.frequency.value = 34; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(o.frequency); o.connect(envGain(c, t0, 0.015, 0.1, i ? 0.32 : 0.12));
      o.start(t0); lfo.start(t0); o.stop(t0 + 0.5); lfo.stop(t0 + 0.5);
    });
  },
  kick:  function(){ tone('sine', 160, 45, 0.004, 0.9, 0.17); burst('highpass', 1800, 0.7, 0.002, 0.25, 0.05); },
  net:   function(){ burst('bandpass', 900, 0.8, 0.01, 0.45, 0.45, 500); },
  glove: function(){ burst('lowpass', 600, 0.7, 0.003, 0.8, 0.12); tone('sine', 110, 70, 0.003, 0.4, 0.1); },
  cheer: function(){ burst('bandpass', 700, 0.6, 0.18, 0.5, 1.7, 1100); burst('bandpass', 1500, 1.2, 0.25, 0.18, 1.4); },
  groan: function(){ burst('lowpass', 520, 0.9, 0.12, 0.42, 1.3, 260); tone('sawtooth', 150, 95, 0.15, 0.03, 1.0); },
  thump: function(){ tone('sine', 95, 55, 0.004, 0.55, 0.09); },
  snap:  function(){ burst('highpass', 1600, 0.8, 0.002, 0.55, 0.07); tone('sine', 140, 60, 0.003, 0.4, 0.08); },
  win:   function(){ tone('triangle', 660, 0, 0.01, 0.18, 0.16); tone('triangle', 990, 0, 0.01, 0.18, 0.28, 0.13); },
  fanfare: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone('square', f, 0, 0.01, 0.06, i === 3 ? 0.5 : 0.12, i * 0.12); }); },
  draw:  function(){ tone('triangle', 520, 0, 0.01, 0.12, 0.2); },
  tick:  function(){ tone('square', 1200, 0, 0.002, 0.05, 0.03); },
  pop:   function(){ tone('sine', 700, 1100, 0.005, 0.14, 0.08); },
  boing: function(){ tone('sine', 220, 660, 0.005, 0.2, 0.18); },
  heave: function(){ burst('lowpass', 300, 1.2, 0.05, 0.5, 0.35, 160); tone('sawtooth', 120, 80, 0.04, 0.05, 0.3); },
  slide: function(){ burst('bandpass', 500, 1.5, 0.02, 0.35, 0.4, 250); },
  punch: function(){ tone('sine', 130, 50, 0.003, 0.9, 0.14); burst('lowpass', 900, 0.8, 0.002, 0.6, 0.08); },
  block: function(){ burst('highpass', 900, 0.8, 0.002, 0.4, 0.06); tone('square', 300, 220, 0.002, 0.06, 0.06); },
  bell:  function(){ [0, 0.18].forEach(function(dl){ tone('sine', 1250, 0, 0.002, 0.25, 0.9, dl); tone('sine', 2500, 0, 0.002, 0.08, 0.5, dl); }); },
  bang:  function(){ burst('lowpass', 2400, 0.7, 0.001, 1.0, 0.35, 300); tone('sine', 90, 40, 0.002, 0.7, 0.25); },
  wind:  function(){ burst('bandpass', 400, 0.6, 0.4, 0.12, 1.2, 700); },
  send:  function(){ tone('sine', 880, 1320, 0.004, 0.08, 0.06); }
};
function ambience(on){
  var c = on ? ac() : Snd.ctx;
  if (on && c && !Snd.amb){
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(c); s.loop = true; f.type = 'lowpass'; f.frequency.value = 480; g.gain.value = 0.03;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    Snd.amb = {s:s, g:g};
  } else if (!on && Snd.amb){
    try { Snd.amb.s.stop(); } catch (e) {}
    Snd.amb = null;
  }
}
// Vibration: Telegram's haptics work on iPhone inside Telegram; elsewhere phones that allow it get a short buzz.
function haptic(kind){
  try {
    var H = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
    if (H){
      if (kind === 'success' || kind === 'error' || kind === 'warning') H.notificationOccurred(kind);
      else if (kind === 'tap') H.selectionChanged();
      else H.impactOccurred(kind);
      return;
    }
    if (navigator.vibrate) navigator.vibrate({tap: 8, light: 12, medium: 25, heavy: 45, rigid: 20, success: [20, 40, 30], error: [40, 30, 40], warning: 30}[kind] || 15);
  } catch (e) {}
}
var ICON_SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
var ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function paintMute(){
  $('muteBtn').innerHTML = Snd.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
  $('muteBtn').setAttribute('aria-label', Snd.muted ? 'Turn sound on' : 'Turn sound off');
}
