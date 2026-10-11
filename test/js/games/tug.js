/* Duelist · js/games/tug.js
   TUG OF WAR scene. */

/* ---------------------------- TUG OF WAR ---------------------------- */
var TUG_STEP = 28;
function paintTugBg(c){
  var g = c.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#5cc0ff'); g.addColorStop(1, '#c9eeff');
  c.fillStyle = g; c.fillRect(0, 0, 400, 170);
  [[60, 40, 34], [300, 26, 26], [190, 58, 20]].forEach(function(cl){
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(cl[0], cl[1], cl[2], cl[2] * 0.42, 0, 0, 7); c.ellipse(cl[0] + cl[2] * 0.6, cl[1] - 6, cl[2] * 0.6, cl[2] * 0.4, 0, 0, 7); c.fill();
  });
  c.fillStyle = '#7fd36a'; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.ellipse(80, 175, 150, 50, 0, Math.PI, 0); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(330, 178, 140, 42, 0, Math.PI, 0); c.fill(); c.stroke();
  c.fillStyle = '#52d052'; c.fillRect(0, 168, 400, 132);
  for (var i = 0; i < 6; i++){ c.fillStyle = i % 2 ? '#52d052' : '#48c64a'; c.fillRect(0, 168 + i * 22, 400, 22); }
  c.fillStyle = INK; c.fillRect(0, 166, 400, 3);
  // mud pit in the middle
  c.fillStyle = '#8a5a2b'; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.ellipse(200, 252, 52, 13, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#a8713a'; c.beginPath(); c.ellipse(192, 249, 26, 5, 0, 0, 7); c.fill();
  // winning lines for each side
  [[200 - 3 * TUG_STEP, '#3d9bff'], [200 + 3 * TUG_STEP, '#ff8a2a']].forEach(function(m){
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 2;
    c.fillRect(m[0] - 3, 236, 6, 30); c.strokeRect(m[0] - 3, 236, 6, 30);
    c.beginPath(); c.moveTo(m[0], 236); c.lineTo(m[0], 206); c.stroke();
    c.fillStyle = m[1]; c.beginPath(); c.moveTo(m[0], 206); c.lineTo(m[0] + (m[0] < 200 ? -18 : 18), 212); c.lineTo(m[0], 218); c.closePath(); c.fill(); c.stroke();
  });
}
function tugger(x, dir, kit, skin, hair, lean, ropeY){
  var hipY = 216, hip = [x, hipY];
  var sh = rot(0, -36, -dir * lean), shoulder = [x + sh[0], hipY + sh[1]];
  var hd = rot(0, -52, -dir * lean * 1.05), head = [x + hd[0], hipY + hd[1]];
  var grab = [x + dir * 26, ropeY], grab2 = [x + dir * 44, ropeY];
  var footF = [x + dir * 30, 250], footB = [x + dir * 4, 252];
  return [
    sCap(hip[0], hip[1], footB[0], footB[1], 11, '#2b2a5c'),
    sEll(footB[0] + dir * 3, 253, 8, 4.5, INK),
    sCap(hip[0], hip[1], footF[0], footF[1], 11, '#2b2a5c'),
    sEll(footF[0] + dir * 4, 252, 8, 4.5, INK),
    sCap(shoulder[0], shoulder[1], grab2[0], grab2[1], 8, skin),
    sCap(hip[0], hip[1], shoulder[0], shoulder[1], 22, kit),
    sCirc(head[0], head[1], 12, skin),
    sPoly([[head[0] - 12, head[1] - 2], [head[0] - 10, head[1] - 12], [head[0] + 10, head[1] - 12], [head[0] + 12, head[1] - 2]], hair),
    sRR(head[0] - 12, head[1] - 7, 24, 5, 2, kit),
    sCirc(head[0] + dir * 6, head[1] + 1, 1.8, INK),
    sCap(shoulder[0], shoulder[1], grab[0], grab[1], 8, skin),
    sCirc(grab[0], grab[1], 5, skin)
  ];
}
function renderTug(t){
  if (!S || !cv.width) return;
  sceneBg('tug', paintTugBg);
  var c = ctx, T = A.tug, hist = S.kicks, pos = tugPos(hist), lean0 = 0.42 + 0.02 * Math.sin(clock * 3), lean1 = lean0, posPx;
  var shake = 0, bids = null, from = pos, to = pos;
  if (T){
    from = T.from; to = T.to;
    if (t < 0.55){ shake = Math.sin(t * 60) * 1.4; lean0 = lean1 = 0.55; }
    if (t >= 0.45) bids = [T.b0, T.b1];
    var k = easeBack((t - 0.75) / 0.5);
    pos = lerp(from, to, t < 0.75 ? 0 : k);
    if (t >= 0.75){
      var won = T.w, f = clamp((t - 0.75) / 0.4, 0, 1);
      if (won === 0){ lean0 = 0.65; lean1 = 0.55 - 0.7 * f; }
      if (won === 1){ lean1 = 0.65; lean0 = 0.55 - 0.7 * f; }
      if (won === null){ lean0 = lean1 = 0.55 + Math.sin(t * 40) * 0.03; }
    }
  }
  posPx = pos * TUG_STEP;
  var cx = 200 + posPx, ropeY = 184;
  // rope
  c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = 11; c.beginPath(); c.moveTo(-10, ropeY + 2); c.quadraticCurveTo(200, ropeY + 8, 410, ropeY + 2); c.stroke();
  c.strokeStyle = '#d9a35c'; c.lineWidth = 6; c.stroke();
  c.strokeStyle = '#8a5a1e'; c.lineWidth = 1.6;
  for (var x = ((cx % 12) + 12) % 12 - 12; x < 410; x += 12){
    var yy = ropeY + 2 + 6 * (1 - Math.pow((x - 200) / 210, 2));
    c.beginPath(); c.moveTo(x - 2, yy - 2.5); c.lineTo(x + 2, yy + 2.5); c.stroke();
  }
  // the rag on the rope marks the middle
  var ry = ropeY + 2 + 6 * (1 - Math.pow((cx - 200) / 210, 2));
  drawToon(c, [sPoly([[cx - 6, ry], [cx + 6, ry], [cx + 3, ry + 26], [cx - 3, ry + 22]], '#ff4d5e')]);
  // players
  drawToon(c, tugger(cx - 118 + shake, 1, KITC[0], SKIN[0], HAIR[0], lean0, ry - 2));
  drawToon(c, tugger(cx + 118 - shake, -1, KITC[1], SKIN[1], HAIR[1], lean1, ry - 2));
  // dust when the rope jumps
  if (T && t > 0.75 && t < 1.4 && T.w !== null){
    var f2 = (t - 0.75) / 0.65, dx = T.w === 0 ? cx - 118 + 30 : cx + 118 - 30;
    c.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - f2)) + ')';
    for (var i = 0; i < 4; i++){ c.beginPath(); c.arc(dx + (i - 1.5) * 9 * (1 + f2), 250 - f2 * 10 - i % 2 * 4, 5 + f2 * 6, 0, 7); c.fill(); }
  }
  // strength left
  var left = tugLeft(hist);
  if (T && t < 0.75){ left = [T.left0[0], T.left0[1]]; }
  pill(c, 10, 10, pname(0) + ' · ' + left[0], KITC[0], 'l');
  pill(c, 390, 10, pname(1) + ' · ' + left[1], KITC[1], 'r');
  if (bids){
    var pop = easeBack((t - 0.45) / 0.25);
    c.save(); c.translate(cx - 130, 112); c.scale(pop, pop); bubbleNum(c, 0, 0, String(bids[0]), KITC[0]); c.restore();
    c.save(); c.translate(cx + 130, 112); c.scale(pop, pop); bubbleNum(c, 0, 0, String(bids[1]), KITC[1]); c.restore();
  }
  if (T && t > 0.9){
    outlineText(c, T.w === null ? 'STALEMATE!' : 'HEAVE!', 200, 70, 34, T.w === null ? '#ffffff' : KITC[T.w]);
  } else if (!T){
    outlineText(c, 'PULL!', 200, 70, 30, '#ffd84a');
  }
}
