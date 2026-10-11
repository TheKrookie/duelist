/* Duelist · js/games/quickdraw.js
   QUICK DRAW scene. */

/* ---------------------------- QUICK DRAW ---------------------------- */
function paintQdBg(c){
  var g = c.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, '#6f46c4'); g.addColorStop(0.55, '#ff7a6b'); g.addColorStop(1, '#ffd36b');
  c.fillStyle = g; c.fillRect(0, 0, 400, 205);
  c.fillStyle = '#fff1a8'; c.beginPath(); c.arc(200, 182, 48, 0, 7); c.fill();
  c.fillStyle = '#7a2f72'; c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 196); c.lineTo(0, 150); c.lineTo(30, 150); c.lineTo(40, 132); c.lineTo(96, 132); c.lineTo(108, 150); c.lineTo(140, 162); c.lineTo(150, 196); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(250, 196); c.lineTo(262, 158); c.lineTo(300, 150); c.lineTo(310, 124); c.lineTo(372, 124); c.lineTo(382, 146); c.lineTo(400, 150); c.lineTo(400, 196); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#f2b45c'; c.fillRect(0, 196, 400, 104);
  c.fillStyle = '#e7a24a'; for (var i = 0; i < 4; i++) c.fillRect(0, 214 + i * 24, 400, 10);
  c.fillStyle = INK; c.fillRect(0, 194, 400, 3);
  c.strokeStyle = 'rgba(27,18,54,.35)'; c.lineWidth = 1.5;
  [[60, 280, 90, 272], [300, 286, 330, 276], [180, 296, 214, 288]].forEach(function(l){ c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.lineTo(l[2] + 8, l[3] + 6); c.stroke(); });
  function cactus(x, y, s){
    drawToon(c, [sCap(x, y, x, y - 46 * s, 12 * s, '#3fae4f'), sCap(x - 12 * s, y - 20 * s, x - 12 * s, y - 34 * s, 8 * s, '#3fae4f'),
      sCap(x - 12 * s, y - 20 * s, x, y - 20 * s, 8 * s, '#3fae4f'), sCap(x + 12 * s, y - 26 * s, x + 12 * s, y - 40 * s, 8 * s, '#3fae4f'), sCap(x + 12 * s, y - 26 * s, x, y - 26 * s, 8 * s, '#3fae4f')]);
  }
  cactus(28, 236, 1); cactus(372, 230, 0.85); cactus(206, 214, 0.5);
}
function cowboy(x, dir, kit, skin, o){
  var fall = o.fall || 0, armUp = o.draw || 0;
  var hip = [x, 236], chest = [x, 208], head = [x + dir * 1, 190];
  var sh = [x + dir * 4, 205];
  var hand = [lerp(x + dir * 8, x + dir * 34, armUp), lerp(234, 202, armUp)];
  var sh2 = [x - dir * 4, 206], hand2 = [x - dir * 9, 232];
  var shapes = [
    sCap(sh2[0], sh2[1], hand2[0], hand2[1], 7, kit),
    sCap(hip[0], hip[1], x - dir * 6, 262, 10, '#3b5bdb'), sRR(x - dir * 6 - 7, 258, 14, 8, 3, '#7a3b14'),
    sCap(hip[0], hip[1], x + dir * 8, 262, 10, '#3b5bdb'), sRR(x + dir * 8 - 7, 258, 14, 8, 3, '#7a3b14'),
    sRR(x - 10, 230, 20, 6, 2, '#5a3412'),
    sCap(hip[0], hip[1] - 4, chest[0], chest[1], 22, kit),
    sPoly([[chest[0] - 9, chest[1] - 6], [chest[0] + 9, chest[1] - 6], [chest[0] + dir * 3, chest[1] + 8]], '#ff4d5e'),
    sCirc(head[0], head[1], 10, skin),
    sCirc(head[0] + dir * 5, head[1] + 1, 1.6, INK)
  ];
  var hatY = head[1] - 9 - (o.hatFly || 0) * 40, hatX = head[0] - dir * (o.hatFly || 0) * 30;
  var hat = [sEll(hatX, hatY, 18, 4, '#8b4a1f'), sRR(hatX - 9, hatY - 13, 18, 13, 5, '#8b4a1f'), sRR(hatX - 9, hatY - 4, 18, 3, 1, kit)];
  var gun = armUp > 0.1 ? [sRR(hand[0] + (dir > 0 ? 0 : -16), hand[1] - 4, 16, 6, 2, '#4a4f5c'), sRR(hand[0] - 3, hand[1] - 2, 6, 9, 2, '#4a4f5c')] : [];
  var arm = [sCap(sh[0], sh[1], hand[0], hand[1], 7, kit)].concat(gun, [sCirc(hand[0], hand[1], 4, skin)]);
  return {body: shapes, hat: hat, arm: arm, fall: fall, x: x, dir: dir, hand: hand};
}
function drawCowboy(c, cb){
  c.save();
  if (cb.fall){ c.translate(cb.x, 262); c.rotate(-cb.dir * cb.fall * 1.4); c.translate(-cb.x, -262); }
  drawToon(c, cb.body); drawToon(c, cb.arm);
  c.restore();
  c.save();
  drawToon(c, cb.hat);
  c.restore();
}
function msText(ms){ return ms < 0 ? 'TOO EARLY!' : ms >= 9999 ? 'NO SHOT' : ms >= 9998 ? 'HELD FIRE' : (ms / 1000).toFixed(3) + 's'; }
function renderQd(t){
  if (!S || !cv.width) return;
  sceneBg('qd', paintQdBg);
  var c = ctx, Q = A.qd, L = S.qdLive, now = performance.now();
  var o = [{}, {}], word = null, wordCol = '#ffffff', flashA = 0;
  if (L && !Q){
    var e = (now - L.start) / 1000;
    if (L.phase === 'ready') word = 'READY…';
    else if (L.phase === 'steady') word = 'STEADY…';
    else if (L.phase === 'draw'){
      word = 'DRAW!'; wordCol = '#ffd84a';
      var se = (now - L.drawShown) / 1000; flashA = se < 0.1 ? 0.65 * (1 - se / 0.1) : 0;
      [0, 1].forEach(function(p){ if (L.taps[p] != null && L.taps[p] >= 0) o[p].draw = 1; });
    }
    [0, 1].forEach(function(p){ if (L.taps[p] === -1) o[p].draw = 0.5; });
  }
  if (Q){
    var w = Q.w;
    [0, 1].forEach(function(p){
      var ms = Q.ms[p];
      if (ms >= 0 && ms < 9999) o[p].draw = ease(t / (0.1 + (p === w ? 0 : 0.12)));
      if (ms < 0) o[p].draw = 0.4;
    });
    if (w !== null){
      var l = 1 - w;
      if (t > 0.18){ o[l].fall = ease((t - 0.25) / 0.5); o[l].hatFly = ease((t - 0.18) / 0.5); }
      if (t > 0.1 && t < 0.24){
        var hnd = cowboy(w === 0 ? 120 : 280, w === 0 ? 1 : -1, KITC[w], SKIN[w], o[w]).hand, d = w === 0 ? 1 : -1;
        c.save(); c.fillStyle = '#ffe14a'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath();
        for (var i = 0; i < 14; i++){ var a = i / 14 * Math.PI * 2, rr = i % 2 ? 5 : 13; c.lineTo(hnd[0] + d * 26 + Math.cos(a) * rr, hnd[1] - 1 + Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.stroke(); c.restore();
      }
    }
  }
  drawCowboy(c, cowboy(120, 1, KITC[0], SKIN[0], o[0]));
  drawCowboy(c, cowboy(280, -1, KITC[1], SKIN[1], o[1]));
  pill(c, 10, 10, pname(0), KITC[0], 'l');
  pill(c, 390, 10, pname(1), KITC[1], 'r');
  if (Q && t > 0.3){
    [0, 1].forEach(function(p){
      var ms = Q.ms[p];
      c.save(); c.translate(p === 0 ? 120 : 280, 148);
      bubbleNum(c, 0, 0, msText(ms), ms < 0 ? '#ff4d5e' : (p === Q.w ? '#239140' : INK)); c.restore();
    });
    if (t > 0.6) outlineText(c, Q.w === null ? 'NO WINNER' : (Q.why === 'early' ? 'FALSE START!' : 'BANG!'), 200, 64, 34, Q.w === null ? '#ffffff' : KITC[Q.w]);
  } else if (word){
    outlineText(c, word, 200, 70, word === 'DRAW!' ? 64 : 38, wordCol);
  } else if (!Q){
    outlineText(c, 'HANDS OFF…', 200, 70, 30, '#ffffff');
  }
  if (flashA){ c.fillStyle = 'rgba(255,255,255,' + flashA + ')'; c.fillRect(0, 0, 400, 300); }
}
