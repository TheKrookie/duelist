/* Duelist · js/games/rps.js
   ROCK PAPER SCISSORS: arms and hands scene. */

/* =====================================================================
   ROCK PAPER SCISSORS SCENE
   Two arms reach in from the sides of the stadium, pump three times
   ("rock... paper... scissors...") and throw together. Hands are drawn
   as real anatomy seen from the thumb side: palm, knuckles, separate
   tapered fingers with joints and nails, and a thumb that wraps or
   opens depending on the sign.
   ===================================================================== */
var PUMP = 0.4, RPS_REVEAL = 1.2, RPS_RESULT_T = 2.35;
var SKINS = [
  {base:'#e2b08a', light:'#f3cfab', shade:'#b98262', line:'rgba(27,18,54,.9)', nail:'rgba(255,236,226,.6)', crease:'rgba(120,64,40,.45)'},
  {base:'#a86f48', light:'#c68d63', shade:'#7c4d31', line:'rgba(27,18,54,.95)', nail:'rgba(236,204,186,.5)', crease:'rgba(60,30,16,.5)'}
];
var SIGN = ['rock', 'paper', 'scissors'];

function grad(c, y0, y1, sk){
  var g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, sk.light); g.addColorStop(0.45, sk.base); g.addColorStop(1, sk.shade);
  return g;
}
// One finger: a tapered capsule pointing along +x from its base, with joint creases and a nail.
function finger(c, x, y, ang, len, w, sk, nail){
  c.save(); c.translate(x, y); c.rotate(ang);
  var tip = w * 0.42;
  c.beginPath();
  c.moveTo(0, -w / 2);
  c.quadraticCurveTo(len * 0.5, -w * 0.54, len - tip, -w * 0.38);
  c.quadraticCurveTo(len + 1, -w * 0.32, len + 1, 0);
  c.quadraticCurveTo(len + 1, w * 0.34, len - tip, w * 0.36);
  c.quadraticCurveTo(len * 0.5, w * 0.5, 0, w / 2);
  c.closePath();
  c.fillStyle = grad(c, -w / 2, w / 2, sk); c.fill();
  c.strokeStyle = sk.line; c.lineWidth = 1.7; c.stroke();
  c.strokeStyle = sk.crease; c.lineWidth = 0.9;
  [0.42, 0.72].forEach(function(f){
    c.beginPath(); c.moveTo(len * f, -w * 0.4); c.quadraticCurveTo(len * f + 1.2, -w * 0.1, len * f, w * 0.05); c.stroke();
  });
  if (nail){
    c.fillStyle = sk.nail;
    c.beginPath();
    if (c.roundRect) c.roundRect(len - w * 0.7, -w * 0.36, w * 0.55, w * 0.3, w * 0.14); else c.rect(len - w * 0.7, -w * 0.36, w * 0.55, w * 0.3);
    c.fill();
  }
  c.restore();
}
// A curled finger seen end-on from the side: the middle segment with a knuckle bump.
function curled(c, x, y, w, h, sk){
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, h * 0.5); else c.rect(x, y, w, h);
  c.fillStyle = grad(c, y, y + h, sk); c.fill();
  c.strokeStyle = sk.line; c.lineWidth = 1.7; c.stroke();
  c.strokeStyle = sk.crease; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(x + w * 0.55, y + 1.5); c.lineTo(x + w * 0.55, y + h - 1.5); c.stroke();
}
function palm(c, sk, front){
  c.beginPath();
  c.moveTo(-8, -15);
  c.bezierCurveTo(6, -20, 24, -21, front - 4, -18);
  c.bezierCurveTo(front + 3, -15, front + 4, 11, front - 2, 16);
  c.bezierCurveTo(22, 21, 4, 21, -8, 15);
  c.closePath();
  c.fillStyle = grad(c, -20, 20, sk); c.fill();
  c.strokeStyle = sk.line; c.lineWidth = 1.7; c.stroke();
  // tendons on the back of the hand
  c.strokeStyle = 'rgba(255,240,225,.18)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(2, -14); c.quadraticCurveTo(16, -17, front - 6, -16); c.stroke();
}
function handShape(c, sign, sk){
  if (sign === 'rock'){
    palm(c, sk, 38);
    for (var i = 3; i >= 0; i--) curled(c, 28, -14 + i * 8.2, 20, 8.6, sk);
    finger(c, 0, -13, 0.34, 34, 11.5, sk, true);                    // thumb wrapped across the front
  } else if (sign === 'paper'){
    var ys = [11, 3.5, -4, -11.5], lens = [33, 41, 44, 40], angs = [0.08, 0.03, -0.02, -0.07];
    for (var k = 0; k < 4; k++) finger(c, 28, ys[k], angs[k], lens[k], 8.6, sk, k === 3);
    palm(c, sk, 34);
    finger(c, 6, -13, -0.62, 29, 11, sk, true);                      // thumb opened upward
  } else {
    curled(c, 27, 6, 19, 8.4, sk); curled(c, 27, 13.5, 18, 7.8, sk);  // ring and little finger curled
    finger(c, 28, -2, 0.12, 46, 9.2, sk, false);                       // middle finger
    palm(c, sk, 34);
    finger(c, 28, -10.5, -0.3, 44, 9.4, sk, true);                     // index finger
    finger(c, 4, -9, 0.42, 30, 11, sk, true);                          // thumb over the curled fingers
  }
}
function rpsArm(c, side, sign, ang, pop, kit, sk, dim){
  c.save();
  c.globalAlpha = dim;
  if (side === 1){ c.translate(400, 0); c.scale(-1, 1); }
  c.translate(-62, 190);
  c.rotate(ang);
  // sleeve with cuff and folds
  var sg = c.createLinearGradient(0, -30, 0, 30);
  sg.addColorStop(0, kit); sg.addColorStop(1, 'rgba(0,0,0,.35)');
  c.beginPath(); c.moveTo(-40, -30); c.lineTo(92, -24); c.quadraticCurveTo(100, 0, 92, 24); c.lineTo(-40, 32); c.closePath();
  c.fillStyle = kit; c.fill(); c.fillStyle = sg; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(30, -26); c.quadraticCurveTo(40, -6, 34, 14); c.stroke();
  c.beginPath(); c.moveTo(60, -24); c.quadraticCurveTo(66, 0, 58, 20); c.stroke();
  c.fillStyle = '#f4f6f2'; c.fillRect(84, -24, 8, 48);
  // forearm tapering to the wrist
  c.beginPath();
  c.moveTo(90, -19); c.bezierCurveTo(120, -20, 140, -16, 168, -13);
  c.lineTo(168, 13); c.bezierCurveTo(140, 16, 118, 22, 90, 20);
  c.closePath();
  c.fillStyle = grad(c, -20, 22, sk); c.fill();
  c.strokeStyle = sk.line; c.lineWidth = 1.7; c.stroke();
  c.strokeStyle = sk.crease; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(166, -10); c.quadraticCurveTo(169, 0, 166, 10); c.stroke();
  // the hand
  c.translate(174, 0);
  c.scale(pop, pop);
  handShape(c, sign, sk);
  c.restore();
}
function pill(c, x, y, text, col, align){
  c.font = '13px "Lilita One",sans-serif';
  var w = c.measureText(text.toUpperCase()).width + 16, bx = align === 'r' ? x - w : x;
  c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath();
  if (c.roundRect) c.roundRect(bx, y, w, 20, 7); else c.rect(bx, y, w, 20);
  c.fill(); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 3; c.strokeText(text.toUpperCase(), bx + w / 2, y + 10.5);
  c.fillStyle = '#fff'; c.fillText(text.toUpperCase(), bx + w / 2, y + 10.5);
}
function rpsBeats(a, b){ return a === b ? null : ((a - b + 3) % 3 === 1 ? 0 : 1); }

function renderRps(t){
  if (!S || !cv.width) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.fillStyle = 'rgba(29,79,196,.55)'; ctx.fillRect(0, 0, 400, 300);
  var spot = ctx.createRadialGradient(200, 190, 20, 200, 190, 220);
  spot.addColorStop(0, 'rgba(255,244,214,.16)'); spot.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = spot; ctx.fillRect(0, 0, 400, 300);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(128, 262, 60, 8, 0, 0, Math.PI * 2); ctx.ellipse(272, 262, 60, 8, 0, 0, Math.PI * 2); ctx.fill();

  var R = A.rps, signA = 'rock', signB = 'rock', ang = 0, pop = 1, dropA = 0, dropB = 0, word = null;
  if (!R){
    ang = Math.sin(clock * 2.2) * 0.012;
  } else if (t < RPS_REVEAL){
    var n = Math.floor(t / PUMP), ph = (t % PUMP) / PUMP;
    var lift = ph < 0.55 ? 1 - Math.pow(1 - ph / 0.55, 2) : 1 - Math.pow((ph - 0.55) / 0.45, 2);
    ang = -lift * 0.2;
    word = ['Rock', 'Paper', 'Scissors'][Math.min(2, n)];
  } else {
    signA = SIGN[R.a]; signB = SIGN[R.b];
    var k = (t - RPS_REVEAL) / 0.16;
    pop = k < 1 ? 0.86 + 0.2 * k : 1.06 - Math.min(0.06, (k - 1) * 0.04);
    if (t < RPS_REVEAL + 0.45) word = 'Shoot!';
    var fade = clamp((t - RPS_REVEAL - 0.5) / 0.3, 0, 1);
    var droop = 0.16 * (fade * fade * (3 - 2 * fade));   // the losing hand sinks away
    if (R.w === 1) dropA = droop;
    if (R.w === 0) dropB = droop;
  }
  rpsArm(ctx, 0, signA, ang + dropA, pop, KITC[0], SKINS[0], 1);
  rpsArm(ctx, 1, signB, ang + dropB, pop, KITC[1], SKINS[1], 1);

  pill(ctx, 12, 12, pname(0), KITC[0], 'l');
  pill(ctx, 388, 12, pname(1), KITC[1], 'r');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (word){
    outlineText(ctx, word.toUpperCase(), 200, 74, 36, '#ffd84a');
  } else if (R && t >= RPS_REVEAL + 0.45){
    var line = R.w === null ? 'Draw' : SIGN[R.w === 0 ? R.a : R.b] + ' beats ' + SIGN[R.w === 0 ? R.b : R.a];
    outlineText(ctx, line.toUpperCase(), 200, 74, 30, R.w === null ? '#ffffff' : KITC[R.w]);
  } else if (!R){
    outlineText(ctx, 'PICK YOUR SIGN BELOW', 200, 74, 18, '#ffffff');
  }
}
