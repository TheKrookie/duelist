/* Duelist · js/games/boxing.js
   BOXING scene. */

/* ------------------------------ BOXING ------------------------------ */
var GLOVES = {
  idle:  {f:[22, -8], r:[12, -2]},
  high:  {f:[16, -20], r:[11, -17]},
  low:   {f:[18, 22], r:[12, 26]},
  duck:  {f:[18, -10], r:[10, -6], crouch:16, lean:9}
};
var ATT = ['JAB', 'HOOK', 'UPPERCUT'], GUARD = ['HIGH GUARD', 'LOW GUARD', 'DUCK'];
function paintBoxBg(c){
  c.fillStyle = '#25286b'; c.fillRect(0, 0, 400, 300);
  var R = rng(5);
  for (var row = 0; row < 3; row++){
    for (var x = 4 + R() * 6; x < 400; x += 12 + R() * 6){
      c.fillStyle = row === 2 ? '#1c1e55' : '#2f3380';
      c.beginPath(); c.arc(x, 112 + row * 14 + R() * 4, 7 + row, Math.PI, 0); c.fill();
    }
  }
  c.fillStyle = 'rgba(255,255,255,.10)';
  [[90, -10], [310, -10]].forEach(function(s){ c.beginPath(); c.moveTo(s[0] - 14, s[1]); c.lineTo(s[0] + 14, s[1]); c.lineTo(s[0] + 90, 250); c.lineTo(s[0] - 90, 250); c.closePath(); c.fill(); });
  // ring floor
  c.fillStyle = '#dfe8ff'; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.moveTo(40, 214); c.lineTo(360, 214); c.lineTo(392, 258); c.lineTo(8, 258); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#c8d6ff'; c.beginPath(); c.ellipse(200, 236, 70, 12, 0, 0, 7); c.fill();
  // apron with the logo
  c.fillStyle = '#ff4d5e'; c.fillRect(8, 258, 384, 42); c.strokeRect(8, 258, 384, 42);
  c.font = '24px "Lilita One",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 5; c.strokeText('duelist', 200, 280); c.fillStyle = '#fff'; c.fillText('duelist', 200, 280);
  c.fillStyle = '#3d9bff'; c.beginPath(); c.arc(152, 280, 4, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#ff8a2a'; c.beginPath(); c.arc(248, 280, 4, 0, 7); c.fill(); c.stroke();
  // corner posts and ropes (behind the fighters)
  [[22, '#3d9bff'], [378, '#ff8a2a']].forEach(function(p){
    c.fillStyle = p[1]; c.fillRect(p[0] - 6, 120, 12, 140); c.strokeRect(p[0] - 6, 120, 12, 140);
  });
  [[138, '#ff4d5e'], [166, '#ffffff'], [194, '#3d9bff']].forEach(function(r){
    c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(28, r[0]); c.lineTo(372, r[0]); c.stroke();
    c.strokeStyle = r[1]; c.lineWidth = 3.5; c.stroke();
  });
}
// Glove target for a boxer this frame. ph = 0..1 progress of the punch.
function punchPos(att, ph, guardPos){
  var g = guardPos;
  if (att === 0) return [lerp(g[0], 66, ph), lerp(g[1], -16, ph)];
  if (att === 1){ var x = lerp(g[0], 58, ph), y = lerp(g[1], -18, ph) - Math.sin(ph * Math.PI) * 22; return [x - Math.sin(ph * Math.PI) * 10, y]; }
  return [lerp(g[0], 50, ph), lerp(26, -26, ph)];
}
function boxer(x, dir, kit, skin, hair, o){
  var cr = o.crouch || 0, ln = o.lean || 0, fall = o.fall || 0;
  var hip = [x, 196 + cr], chest = [x + dir * ln, 156 + cr], head = [chest[0] + dir * 2 - dir * (o.knock || 0), 136 + cr];
  var gf = [chest[0] + dir * o.f[0], chest[1] + o.f[1]], gr = [chest[0] + dir * o.r[0], chest[1] + o.r[1]];
  var shF = [chest[0] + dir * 6, chest[1] + 2], shR = [chest[0] - dir * 6, chest[1] + 2];
  var back = [
    sCap(shR[0], shR[1], gr[0], gr[1], 9, skin), sCirc(gr[0], gr[1], 10.5, kit),
    sCap(hip[0], hip[1], x - dir * 10, 238, 12, skin), sEll(x - dir * 10 + dir * 3, 240, 9, 5, INK),
    sCap(hip[0], hip[1], x + dir * 14, 238, 12, skin), sEll(x + dir * 14 + dir * 3, 240, 9, 5, INK),
    sRR(x - 16, 182 + cr, 32, 20, 6, kit),
    sCap(hip[0], hip[1] - 8, chest[0], chest[1], 28, skin),
    sCirc(head[0], head[1], 13, skin),
    sPoly([[head[0] - 13, head[1] - 2], [head[0] - 11, head[1] - 13], [head[0] + 11, head[1] - 13], [head[0] + 13, head[1] - 2]], hair),
    sCirc(head[0] + dir * 7, head[1] + 1, 1.9, INK)
  ];
  var front = [sCap(shF[0], shF[1], gf[0], gf[1], 9, skin), sCirc(gf[0], gf[1], 11, kit)];
  return {back: back, front: front, fall: fall, x: x, dir: dir, head: head, gf: gf, gr: gr};
}
function drawBoxer(c, b){
  c.save();
  if (b.fall){ c.translate(b.x, 240); c.rotate(-b.dir * b.fall * 1.35); c.translate(-b.x, -240); }
  drawToon(c, b.back); drawToon(c, b.front);
  // white glove cuffs
  c.strokeStyle = '#fff'; c.lineWidth = 2.2;
  [b.gf, b.gr].forEach(function(g){ c.beginPath(); c.arc(g[0], g[1], 7, Math.PI * 0.55, Math.PI * 1.45); c.stroke(); });
  c.restore();
}
function popText(c, x, y, text, col, t0, t){
  if (t < t0 || t > t0 + 1.0) return;
  var k = (t - t0) / 1.0, s = easeBack(k / 0.25);
  c.save(); c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1; c.translate(x, y - k * 18); c.scale(s, s);
  outlineText(c, text, 0, 0, 20, col); c.restore();
}
function renderBox(t){
  if (!S || !cv.width) return;
  sceneBg('box', paintBoxBg);
  var c = ctx, B = A.box, bob = Math.sin(clock * 5) * 2;
  var o = [Object.assign({}, GLOVES.idle), Object.assign({}, GLOVES.idle)];
  o[0].crouch = o[1].crouch = bob > 0 ? 1 : 0;
  if (B){
    for (var p = 0; p < 2; p++){
      var gd = GLOVES[['high', 'low', 'duck'][B.g[p]]], kG = ease(t / 0.25);
      var f = [lerp(GLOVES.idle.f[0], gd.f[0], kG), lerp(GLOVES.idle.f[1], gd.f[1], kG)];
      var r = [lerp(GLOVES.idle.r[0], gd.r[0], kG), lerp(GLOVES.idle.r[1], gd.r[1], kG)];
      o[p] = {f: f, r: r, crouch: (gd.crouch || 0) * kG, lean: (gd.lean || 0) * kG};
      var ph = t < 0.25 ? 0 : t < 0.5 ? ease((t - 0.25) / 0.25) : 1 - ease((t - 0.62) / 0.3);
      if (B.a[p] === 2) o[p].r = punchPos(2, ph, r); else o[p].f = punchPos(B.a[p], ph, f);
      var hitMe = B.hit[1 - p];  // opponent's punch landed on me
      if (hitMe && t > 0.5 && t < 0.9) o[p].knock = Math.sin((t - 0.5) / 0.4 * Math.PI) * 8;
    }
    if (B.ko !== null && t > 1.0){ o[B.ko].fall = ease((t - 1.0) / 0.5); }
  }
  var b0 = boxer(150, 1, KITC[0], SKIN[0], HAIR[0], o[0]);
  var b1 = boxer(250, -1, KITC[1], SKIN[1], HAIR[1], o[1]);
  drawBoxer(c, b0); drawBoxer(c, b1);
  pill(c, 10, 10, pname(0), KITC[0], 'l');
  pill(c, 390, 10, pname(1), KITC[1], 'r');
  if (B){
    if (t > 0.5 && t < 0.62){
      [0, 1].forEach(function(p){
        var tgt = p === 0 ? b1.head : b0.head;
        c.fillStyle = B.hit[p] ? '#ffd84a' : '#ffffff'; c.strokeStyle = INK; c.lineWidth = 2.5;
        c.beginPath();
        for (var i = 0; i < 16; i++){ var a = i / 16 * Math.PI * 2, rr = i % 2 ? 7 : 16; c.lineTo(tgt[0] - (p === 0 ? 14 : -14) + Math.cos(a) * rr, tgt[1] + Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.stroke();
      });
    }
    [0, 1].forEach(function(p){
      var defX = p === 0 ? 268 : 132, attX = p === 0 ? 132 : 268;
      if (B.hit[p]) popText(c, defX, 92, '-' + B.dmg[p] + ' ' + ATT[B.a[p]] + '!', '#ff4d5e', 0.52, t);
      else { popText(c, defX, 92, 'BLOCKED!', '#ffffff', 0.52, t); popText(c, attX, 118, '-' + B.dmg[p] + ' COUNTER', '#ffd84a', 0.62, t); }
    });
    if (B.ko !== null && t > 1.2) outlineText(c, 'K.O.!', 200, 70, 50, '#ffd84a');
  } else {
    outlineText(c, 'FIGHT!', 200, 66, 30, '#ffd84a');
  }
}
