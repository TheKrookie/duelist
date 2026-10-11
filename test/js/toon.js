/* Duelist · js/toon.js
   Cartoon toolkit for the side-view games (Tug of War, Boxing, Quick Draw). */

/* =====================================================================
   CARTOON TOOLKIT for the side-view games (Tug of War, Boxing, Quick Draw).
   A figure is a list of shapes. drawToon() paints the whole silhouette in
   ink first (a little fatter), then the colours on top, which gives the
   thick-outline cartoon look.
   ===================================================================== */
var SKIN = ['#f2c39c', '#b97a4e'], HAIR = ['#3a2516', '#1f150d'];
function sCap(x1, y1, x2, y2, w, col){ return {t:'cap', x1:x1, y1:y1, x2:x2, y2:y2, w:w, col:col}; }
function sCirc(x, y, r, col){ return {t:'circ', x:x, y:y, r:r, col:col}; }
function sRR(x, y, w, h, r, col){ return {t:'rr', x:x, y:y, w:w, h:h, r:r, col:col}; }
function sPoly(pts, col){ return {t:'poly', pts:pts, col:col}; }
function sEll(x, y, rx, ry, col){ return {t:'ell', x:x, y:y, rx:rx, ry:ry, col:col}; }
function paintShape(c, s, ink){
  var o = ink ? 2.6 : 0;
  c.fillStyle = ink ? INK : s.col; c.strokeStyle = ink ? INK : s.col;
  if (s.t === 'cap'){
    c.lineCap = 'round'; c.lineWidth = s.w + o * 2;
    c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
  } else if (s.t === 'circ'){
    c.beginPath(); c.arc(s.x, s.y, s.r + o, 0, Math.PI * 2); c.fill();
  } else if (s.t === 'ell'){
    c.beginPath(); c.ellipse(s.x, s.y, s.rx + o, s.ry + o, 0, 0, Math.PI * 2); c.fill();
  } else if (s.t === 'rr'){
    c.beginPath();
    if (c.roundRect) c.roundRect(s.x - o, s.y - o, s.w + o * 2, s.h + o * 2, s.r + o); else c.rect(s.x - o, s.y - o, s.w + o * 2, s.h + o * 2);
    c.fill();
  } else if (s.t === 'poly'){
    c.lineJoin = 'round'; c.lineWidth = o * 2;
    c.beginPath(); s.pts.forEach(function(p, i){ if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
    c.fill(); if (ink) c.stroke();
  }
}
function drawToon(c, shapes){
  shapes.forEach(function(s){ paintShape(c, s, true); });
  shapes.forEach(function(s){ paintShape(c, s, false); });
}
function ease(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function easeBack(t){ t = clamp(t, 0, 1); var s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); }
function lerp(a, b, k){ return a + (b - a) * k; }
function rot(x, y, a){ var c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }

var BGC = {};
function sceneBg(name, painter){
  var c = BGC[name];
  if (!c || c.width !== cv.width || c.height !== cv.height){
    c = BGC[name] = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height;
    var x = c.getContext('2d'); x.setTransform(K, 0, 0, K, 0, 0);
    painter(x);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.setTransform(K, 0, 0, K, 0, 0);
}
function bubbleNum(c, x, y, text, col){
  c.font = '20px "Lilita One",sans-serif';
  var w = Math.max(40, c.measureText(text).width + 18);
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); if (c.roundRect) c.roundRect(x - w / 2, y - 15, w, 30, 10); else c.rect(x - w / 2, y - 15, w, 30);
  c.fill(); c.stroke();
  c.beginPath(); c.moveTo(x - 6, y + 15); c.lineTo(x, y + 23); c.lineTo(x + 6, y + 15); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(x - 5, y + 12, 10, 4);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col || INK; c.fillText(text, x, y + 1);
}
