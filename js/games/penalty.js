/* Duelist · js/games/penalty.js
   PENALTY DUEL: 3D scene, shooter/keeper animation, ball physics, drawing. */

/* =====================================================================
   SCENE: a small 3D world in metres, seen by a broadcast camera
   standing behind the penalty taker. x = sideways, y = up, z = toward goal.
   ===================================================================== */
var F = 650, CX = 200, HZ = -5, CH = 3.6;          // camera: focal length, centre, horizon, height
var ZS = 9.5, ZG = 20.5, ZN = 22.1, ZK = 20.15;    // ball spot, goal line, back of net, keeper
var GW = 3.66, GH = 2.44, NH = 1.9, BR = 0.11;     // half goal width, bar height, net back height, ball radius
var TC = 1.1, TF = 0.46, RESULT_T = TC + 1.55, DT = 1 / 120; // contact time, ball flight, result time

function proj(v){ var s = F / v[2]; return [CX + v[0] * s, HZ + (CH - v[1]) * s, s]; }
function gy(z){ return HZ + CH * F / z; }
function lerp3(a, b, k){ return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function rotX(v,a){var c=Math.cos(a),s=Math.sin(a);return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c];}
function rotY(v,a){var c=Math.cos(a),s=Math.sin(a);return [v[0]*c + v[2]*s, v[1], -v[0]*s + v[2]*c];}
function rotZ(v,a){var c=Math.cos(a),s=Math.sin(a);return [v[0]*c - v[1]*s, v[0]*s + v[1]*c, v[2]];}

/* ---------- poses: a body is described by a handful of joint angles ---------- */
var KEYS = ['x','y','z','yaw','lean','roll','lf','lk','la','rf','rk','ra','alf','ala','ale','arf','ara','are'];
function mk(base, o){ var p = {}; KEYS.forEach(function(k){ p[k] = (o && k in o) ? o[k] : base[k]; }); return p; }

// Smooth curve through keyframes (cubic Hermite with Catmull-Rom slopes) so moves flow instead of stepping.
function spline(kf, t){
  var n = kf.length;
  if (t <= kf[0].t) return kf[0].p;
  if (t >= kf[n-1].t) return kf[n-1].p;
  var i = 0; while (t >= kf[i+1].t) i++;
  var t0 = kf[i].t, t1 = kf[i+1].t, h = t1 - t0, s = (t - t0) / h;
  var h00 = 2*s*s*s - 3*s*s + 1, h10 = s*s*s - 2*s*s + s, h01 = -2*s*s*s + 3*s*s, h11 = s*s*s - s*s;
  function slope(j, k){
    if (j <= 0 || j >= n - 1) return 0;
    return (kf[j+1].p[k] - kf[j-1].p[k]) / (kf[j+1].t - kf[j-1].t);
  }
  var out = {};
  KEYS.forEach(function(k){
    out[k] = h00 * kf[i].p[k] + h10 * h * slope(i, k) + h01 * kf[i+1].p[k] + h11 * h * slope(i+1, k);
  });
  return out;
}

// Turn a pose into joint positions in the world.
var DOWN = [0,-1,0], FWD = [0,0,1];
function body(p){
  function tf(v){ return rotY(rotX(rotZ(v, p.roll), p.lean), p.yaw); }
  function at(l){ var v = tf(l); return [p.x + v[0], p.y + v[1], p.z + v[2]]; }
  function step(a, l, len){ var d = tf(l); return [a[0] + d[0]*len, a[1] + d[1]*len, a[2] + d[2]*len]; }
  function leg(sd, f, k, ab){
    var hip = at([0.1*sd, 0, 0]);
    var knee = step(hip, rotZ(rotX(DOWN, -f), sd*ab), 0.46);
    var ank = step(knee, rotZ(rotX(DOWN, -(f - k)), sd*ab), 0.44);
    var toe = step(ank, rotZ(rotX(FWD, -(f - k)), sd*ab), 0.17);
    return {hip:hip, knee:knee, ank:ank, toe:toe};
  }
  function arm(sd, f, ab, e){
    var sh = at([0.19*sd, 0.47, 0]);
    var el = step(sh, rotZ(rotX(DOWN, -f), sd*ab), 0.29);
    var ha = step(el, rotZ(rotX(DOWN, -(f + e)), sd*ab), 0.27);
    return {sh:sh, el:el, ha:ha};
  }
  return {
    L: leg(-1, p.lf, p.lk, p.la), R: leg(1, p.rf, p.rk, p.ra),
    AL: arm(-1, p.alf, p.ala, p.ale), AR: arm(1, p.arf, p.ara, p.are),
    hipL: at([-0.16, 0.04, 0]), hipR: at([0.16, 0.04, 0]),
    shL: at([-0.21, 0.48, 0]), shR: at([0.21, 0.48, 0]),
    shoL: at([-0.17, -0.18, 0]), shoR: at([0.17, -0.18, 0]),
    neck: at([0, 0.52, 0]), head: at([0, 0.68, 0]), chest: at([0, 0.28, 0]),
    pelvis: [p.x, p.y, p.z], yaw: p.yaw
  };
}

/* ---------- the shooter: run-up, plant, strike, follow-through ---------- */
var RS = {x:-1.7, z:7.8}, RE = {x:-0.3, z:8.92};
var SBASE = {x:RS.x, y:0.95, z:RS.z, yaw:0.95, lean:0.06, roll:0, lf:0, lk:0.12, la:0.06, rf:0, rk:0.12, ra:0.06,
             alf:0, ala:0.14, ale:0.25, arf:0, ara:0.14, are:0.25};

function runPose(t){
  var A = clamp(t / 0.18, 0, 1);                       // ramps from standing into a full run
  var u = clamp(t / 0.92, 0, 1), e = u*u*(3 - 2*u)*0.35 + u*0.65;
  var ph = 2*Math.PI*(0.042 + 2.4*t), s = Math.sin(ph), c = Math.cos(ph);
  return mk(SBASE, {
    x: RS.x + (RE.x - RS.x)*e, z: RS.z + (RE.z - RS.z)*e,
    y: 0.95 - 0.04*A + 0.035*A*Math.cos(2*ph), yaw: 0.95 - 0.5*e, lean: 0.06 + 0.2*A,
    lf: 0.6*A*s, lk: 0.12 + A*(0.15 + 1.05*Math.max(0, c)),
    rf: -0.6*A*s, rk: 0.12 + A*(0.15 + 1.05*Math.max(0, -c)),
    alf: -0.6*A*s, arf: 0.6*A*s, ale: 0.25 + 1.15*A, are: 0.25 + 1.15*A
  });
}

function shooterFrames(shot){
  var aim = (shot - 1) * 0.12;
  return [
    {t:0.85, p:runPose(0.85)},
    {t:0.92, p:runPose(0.92)},
    // plant: left foot beside the ball, kicking leg cocked back, arm out for balance
    {t:1.02, p:mk(SBASE,{x:-0.27,z:9.0,y:0.9,yaw:0.28,lean:0.04,roll:0.16, lf:0.3,lk:0.35,la:0.1, rf:-0.8,rk:1.8,ra:0.12,
                         alf:0.4,ala:1.25,ale:0.4, arf:-0.35,ara:0.5,are:0.6})},
    // contact
    {t:TC,   p:mk(SBASE,{x:-0.24,z:9.05,y:0.9,yaw:0.12+aim,lean:0,roll:0.13, lf:0.2,lk:0.3,la:0.1, rf:0.55,rk:0.3,ra:0.05,
                         alf:0.6,ala:1.4,ale:0.3, arf:-0.2,ara:0.7,are:0.5})},
    // follow-through
    {t:1.26, p:mk(SBASE,{x:-0.15,z:9.3,y:0.97,yaw:0.1+aim,lean:-0.14,roll:0.05, lf:0.05,lk:0.15,la:0.08, rf:1.25,rk:0.2,ra:0.05,
                         alf:0.9,ala:1.2,ale:0.3, arf:0.3,ara:0.6,are:0.4})},
    {t:1.62, p:mk(SBASE,{x:-0.05,z:9.65,y:0.93,yaw:0.1,lean:0.1,roll:0, lf:-0.25,lk:0.45, rf:0.3,rk:0.4,
                         alf:0.2,ala:0.35,ale:0.6, arf:0.2,ara:0.35,are:0.6})},
    {t:2.5,  p:mk(SBASE,{x:0,z:9.75,y:0.95,yaw:0.05,lean:0.08, alf:0.05,ala:0.2,ale:0.4, arf:0.05,ara:0.2,are:0.4})}
  ];
}

function shooterPose(t, plan){
  if (!plan || t < 0.92) return runPose(plan ? t : 0);
  return spline(plan.sk, t);
}

/* ---------- the keeper: ready stance, split-step, push-off, full-stretch dive ---------- */
var KBASE = {x:0, y:0.8, z:ZK, yaw:Math.PI, lean:0.28, roll:0, lf:0.55, lk:0.95, la:0.22, rf:0.55, rk:0.95, ra:0.22,
             alf:0.45, ala:0.55, ale:0.7, arf:0.45, ara:0.55, are:0.7};
var clock = 0;

function ready(fade){
  return mk(KBASE, {x: 0.07*Math.sin(clock*2.2)*fade, y: 0.8 + 0.02*Math.sin(clock*6.5)*fade});
}

// Keeper faces the camera, so his left leg is on screen right. lead = leg on the dive side.
function legs(o, kd, lead, push){
  var L = kd > 0 ? lead : push, R = kd > 0 ? push : lead;
  o.lf = L[0]; o.lk = L[1]; o.la = L[2]; o.rf = R[0]; o.rk = R[1]; o.ra = R[2];
  return o;
}

function keeperFrames(dive, shot, hi){
  var kd = dive - 1;
  var hop  = mk(KBASE, {y:0.9, lf:0.3, lk:0.5, rf:0.3, rk:0.5, lean:0.2});
  var load = mk(KBASE, {x:kd*0.12, y:0.72, lf:0.7, lk:1.25, rf:0.7, rk:1.25, roll:kd*0.12, la:0.3, ra:0.3});
  var f = [{t:-0.3, p:mk(KBASE)}, {t:-0.12, p:hop}, {t:0, p:load}];
  if (kd !== 0){
    f.push({t:0.2, p:legs(mk(KBASE,{x:kd*0.9, y:0.78 + 0.4*hi, roll:kd*0.8, lean:0.12,
                  alf:0.3,ala:2.3,ale:0.35, arf:0.3,ara:2.3,are:0.35}), kd, [0.8,1.2,0.3], [-0.1,0.15,0.3])});
    f.push({t:TF, p:legs(mk(KBASE,{x:kd*1.75, y:0.55 + 0.55*hi, roll:kd*(1.5 - 0.35*hi), lean:0.1,
                  alf:0.15,ala:2.9,ale:0.05, arf:0.15,ara:2.9,are:0.05}), kd, [0.35,0.5,0.35], [0,0.2,0.4])});
    f.push({t:0.75, p:legs(mk(KBASE,{x:kd*2.05, y:0.27, roll:kd*1.52, lean:0.15,
                  alf:0.3,ala:2.7,ale:0.35, arf:0.3,ara:2.7,are:0.35}), kd, [0.6,0.9,0.25], [0.1,0.3,0.3])});
    f.push({t:1.4, p:legs(mk(KBASE,{x:kd*2.1, y:0.25, roll:kd*1.54, lean:0.15,
                  alf:0.35,ala:2.4,ale:0.7, arf:0.35,ara:2.4,are:0.7}), kd, [0.7,1.1,0.25], [0.1,0.3,0.3])});
  } else if (shot === 1){
    // stands tall and gathers the ball into the chest
    var catchP = {y:0.92, lf:0.25,lk:0.4,rf:0.25,rk:0.4, lean:0.2, alf:1.25,ala:0.35,ale:0.7, arf:1.25,ara:0.35,are:0.7};
    f.push({t:0.22, p:mk(KBASE, catchP)});
    f.push({t:TF, p:mk(KBASE, Object.assign({}, catchP, {alf:1.1, arf:1.1, ale:0.9, are:0.9}))});
    f.push({t:0.8, p:mk(KBASE, {y:0.86, lf:0.4,lk:0.7,rf:0.4,rk:0.7, lean:0.35, alf:0.9,ala:0.3,ale:1.5, arf:0.9,ara:0.3,are:1.5})});
    f.push({t:1.4, p:mk(KBASE, {y:0.88, lf:0.3,lk:0.5,rf:0.3,rk:0.5, lean:0.25, alf:0.9,ala:0.3,ale:1.5, arf:0.9,ara:0.3,are:1.5})});
  } else {
    // stayed in the middle, ball goes to the side: a late, hopeless reach
    var ss = shot - 1;
    f.push({t:0.22, p:mk(KBASE, {y:1.0, lf:0.15,lk:0.25,rf:0.15,rk:0.25, lean:0.12, roll:ss*0.2,
                                 alf:0.3,ala:1.7,ale:0.2, arf:0.3,ara:1.7,are:0.2})});
    f.push({t:TF, p:mk(KBASE, {x:ss*0.25, y:0.98, lf:0.15,lk:0.3,rf:0.15,rk:0.3, lean:0.1, roll:ss*0.35,
                               alf:0.3,ala:2.1,ale:0.15, arf:0.3,ara:2.1,are:0.15})});
    f.push({t:0.8, p:mk(KBASE, {x:ss*0.3, y:0.82, roll:ss*0.1, alf:0.3,ala:1.2,ale:0.4, arf:0.3,ara:1.2,are:0.4})});
    f.push({t:1.4, p:mk(KBASE, {x:ss*0.3, y:0.86, lean:0.45, lf:0.45,lk:0.8,rf:0.45,rk:0.8,
                                alf:0.6,ala:0.3,ale:0.3, arf:0.6,ara:0.3,are:0.3})});
  }
  return f;
}

function keeperPose(r, plan){
  if (!plan || r < -0.3) return ready(plan ? clamp((-0.3 - r) / 0.5, 0, 1) : 1);
  return spline(plan.kk, r);
}

/* ---------- the ball: simulated once per kick, then played back ---------- */
function handsMid(J){ return lerp3(J.AL.ha, J.AR.ha, 0.5); }

function makePlan(shot, dive){
  var hi = Math.random();
  var plan = {shot:shot, dive:dive, sk:shooterFrames(shot), kk:keeperFrames(dive, shot, hi)};
  var saved = shot === dive, sd = shot - 1, target, catching = false;
  var KJ = body(spline(plan.kk, TF));
  if (saved && sd === 0){
    catching = true;
    target = handsMid(KJ); target[2] -= 0.12;
  } else if (saved){
    target = (sd * KJ.AL.ha[0] > sd * KJ.AR.ha[0]) ? KJ.AL.ha.slice() : KJ.AR.ha.slice();
    target[2] -= 0.1;
  } else if (sd === 0){
    target = [(Math.random() - 0.5) * 0.9, 0.4 + Math.random() * 1.5, ZG];
  } else {
    target = [sd * (2.65 + Math.random() * 0.6), 0.3 + Math.random() * 1.8, ZG];
  }
  plan.catching = catching;
  plan.ball = simBall(target, saved, catching, sd);
  return plan;
}

function simBall(tgt, saved, catching, sd){
  var g = 9.8, out = [];
  var p = [0, BR, ZS];
  var v = [(tgt[0] - p[0]) / TF, (tgt[1] - p[1]) / TF + 0.5*g*TF, (tgt[2] - p[2]) / TF];
  var phase = 'fly', bulge = 0, bx = 0, by = 1, spin = 0, n = Math.ceil(2.4 / DT);
  for (var i = 0; i <= n; i++){
    out.push({x:p[0], y:p[1], z:p[2], spin:spin, bulge:bulge, bx:bx, by:by, held:phase === 'held'});
    var t = (i + 1) * DT;
    if (phase === 'held') continue;
    if (phase === 'fly' && saved && t >= TF){
      if (catching){ phase = 'held'; continue; }
      phase = 'free';
      v = [sd * 2.3, 2.6, -6.5];            // parried wide and back into play
    }
    v[1] -= g * DT;
    p[0] += v[0]*DT; p[1] += v[1]*DT; p[2] += v[2]*DT;
    spin += Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]) * DT * 4;
    if (!saved){
      var pen = p[2] - (ZN - BR);
      if (pen > 0){                          // the net catches it like a spring
        v[2] += (-900*pen - 14*v[2]) * DT;
        v[0] *= 0.96;
        bx = p[0]; by = p[1];
        bulge = Math.max(bulge * 0.9, pen);
      } else {
        bulge *= 0.93;
      }
      if (p[2] > ZG + 0.2){ p[0] = clamp(p[0], -GW + BR, GW - BR); }
    }
    if (p[1] < BR){
      p[1] = BR;
      if (v[1] < 0){ v[1] *= -0.45; v[0] *= 0.82; v[2] *= 0.82; }
    }
  }
  return out;
}

function ballAt(r, plan, KJ){
  if (!plan || r < 0) return {x:0, y:BR, z:ZS, spin:0, bulge:0, bx:0, by:1};
  var s = plan.ball[Math.min(plan.ball.length - 1, Math.floor(r / DT))];
  if (s.held){
    var h = handsMid(KJ);
    return {x:h[0], y:h[1], z:h[2] - 0.12, spin:s.spin, bulge:0, bx:0, by:1};
  }
  return s;
}

function line(a, b, w, col){
  var A = proj(a), B = proj(b);
  ctx.strokeStyle = INKPASS ? INK : col;
  ctx.lineWidth = Math.max(0.8, w * (A[2] + B[2]) / 2) + (INKPASS ? 2.8 : 0);
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
}
function dotAt(a, r, col){
  var A = proj(a);
  ctx.fillStyle = INKPASS ? INK : col; ctx.beginPath(); ctx.arc(A[0], A[1], Math.max(0.8, r * A[2]) + (INKPASS ? 1.4 : 0), 0, Math.PI*2); ctx.fill();
}
function poly(pts, col, round){
  var s = 0;
  ctx.beginPath();
  pts.forEach(function(p, i){ var P = proj(p); s += P[2]; if (i) ctx.lineTo(P[0], P[1]); else ctx.moveTo(P[0], P[1]); });
  ctx.closePath();
  ctx.fillStyle = INKPASS ? INK : col; ctx.strokeStyle = INKPASS ? INK : col; ctx.lineWidth = round * s / pts.length + (INKPASS ? 2.8 : 0);
  ctx.fill(); ctx.stroke();
}

function shadow(x, z, rx, a){
  var P = proj([x, 0, z]);
  ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
  ctx.beginPath(); ctx.ellipse(P[0], P[1], rx * P[2], rx * P[2] * 0.3, 0, 0, Math.PI*2); ctx.fill();
}
function figureShadow(J){
  var pts = [J.pelvis, J.chest, J.head, lerp3(J.L.ank, J.R.ank, 0.5)];
  pts.forEach(function(p){ shadow(p[0], p[2], 0.26, Math.max(0.05, 0.22 - p[1] * 0.08)); });
}

function drawLeg(l, k){
  line(l.hip, l.knee, 0.16, k.skin);
  line(l.knee, l.ank, 0.12, k.skin);
  line(lerp3(l.knee, l.ank, 0.2), l.ank, 0.125, k.socks);
  line(l.hip, lerp3(l.hip, l.knee, 0.42), 0.19, k.shorts);
  line(l.ank, l.toe, 0.11, '#141414');
}
function drawArm(a, k){
  if (k.keeper){
    line(a.sh, a.el, 0.11, k.shirt);
    line(a.el, a.ha, 0.095, k.shirt);
    dotAt(a.ha, 0.075, '#f4f6f2');
  } else {
    line(a.sh, a.el, 0.095, k.skin);
    line(a.sh, lerp3(a.sh, a.el, 0.45), 0.12, k.shirt);
    line(a.el, a.ha, 0.08, k.skin);
    dotAt(a.ha, 0.045, k.skin);
  }
}
// Two passes: first the whole silhouette in ink (slightly fatter), then the colours on top.
function drawFigure(J, k){
  INKPASS = true; figureParts(J, k); INKPASS = false; figureParts(J, k);
}
function figureParts(J, k){
  var legsS = [J.L, J.R].sort(function(a, b){ return b.knee[2] - a.knee[2]; });
  legsS.forEach(function(l){ drawLeg(l, k); });
  poly([J.hipL, J.hipR, J.shoR, J.shoL], k.shorts, 0.05);
  var tz = J.chest[2];
  var arms = [J.AL, J.AR];
  function az(a){ return (a.el[2] + a.ha[2]) / 2; }
  arms.forEach(function(a){ if (az(a) > tz) drawArm(a, k); });
  poly([J.shL, J.shR, J.hipR, J.hipL], k.shirt, 0.12);
  var away = Math.cos(J.yaw);
  if (k.num && away > 0.3 && !INKPASS){
    var C = proj(J.chest), A = proj(J.shL), B = proj(J.shR);
    ctx.save();
    ctx.translate(C[0], C[1]);
    ctx.rotate(Math.atan2(B[1] - A[1], B[0] - A[0]));
    ctx.scale(away, 1);
    ctx.font = (0.27 * C[2]) + 'px "Lilita One",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.strokeText(k.num, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillText(k.num, 0, 0);
    ctx.restore();
  }
  arms.forEach(function(a){
    if (az(a) <= tz){
      if (!INKPASS){ INKPASS = true; drawArm(a, k); INKPASS = false; }
      drawArm(a, k);
    }
  });
  line(J.neck, J.head, 0.09, k.skin);
  var H = proj(J.head), N = proj(J.neck), r = 0.12 * H[2];
  if (INKPASS){
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(H[0], H[1], r + 1.5, 0, Math.PI*2); ctx.fill();
    return;
  }
  if (away > 0){
    ctx.fillStyle = k.hair; ctx.beginPath(); ctx.arc(H[0], H[1], r, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = k.skin; ctx.beginPath(); ctx.arc(H[0], H[1], r, 0, Math.PI*2); ctx.fill();
    var up = Math.atan2(H[1] - N[1], H[0] - N[0]);
    ctx.fillStyle = k.hair; ctx.beginPath(); ctx.arc(H[0], H[1], r, up - 1.3, up + 1.3); ctx.closePath(); ctx.fill();
  }
}

function bump(x, y, b){
  if (!b.bulge) return 0;
  var dx = x - b.bx, dy = y - b.by;
  return b.bulge * Math.exp(-(dx*dx + dy*dy) / 0.55);
}
function drawNet(b){
  var xs = [], ys = [], i, j;
  for (i = 0; i <= 24; i++) xs.push(-GW + i * (2 * GW / 24));
  for (j = 0; j <= 8; j++) ys.push(j * NH / 8);
  // shadowed back of the goal
  poly([[-GW, 0, ZN], [GW, 0, ZN], [GW, NH, ZN], [-GW, NH, ZN]], 'rgba(27,18,54,.22)', 0);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.7;
  function path(pts){
    ctx.beginPath();
    pts.forEach(function(p, k){ var P = proj(p); if (k) ctx.lineTo(P[0], P[1]); else ctx.moveTo(P[0], P[1]); });
    ctx.stroke();
  }
  // back panel
  xs.forEach(function(x){ path(ys.map(function(y){ return [x, y, ZN + bump(x, y, b)]; })); });
  ys.forEach(function(y){ path(xs.map(function(x){ return [x, y, ZN + bump(x, y, b)]; })); });
  // roof
  for (j = 0; j <= 5; j++){
    var u = j / 5, yy = GH + (NH - GH) * u, zz = ZG + (ZN - ZG) * u;
    path([[-GW, yy, zz], [GW, yy, zz]]);
  }
  xs.forEach(function(x){ path([[x, GH, ZG], [x, NH, ZN + bump(x, NH, b)]]); });
  // side panels
  [-GW, GW].forEach(function(x){
    for (var q = 0; q <= 5; q++){
      var u = q / 5, z = ZG + (ZN - ZG) * u;
      path([[x, 0, z], [x, GH + (NH - GH) * u, z]]);
    }
    ys.forEach(function(y){ path([[x, y * GH / NH, ZG], [x, y, ZN]]); });
  });
}
function drawFrame(){
  ctx.lineCap = 'butt';
  INKPASS = true;
  line([-GW, 0, ZG], [-GW, GH + 0.06, ZG], 0.12, INK);
  line([GW, 0, ZG], [GW, GH + 0.06, ZG], 0.12, INK);
  line([-GW - 0.06, GH, ZG], [GW + 0.06, GH, ZG], 0.12, INK);
  INKPASS = false;
  line([-GW, 0, ZG], [-GW, GH + 0.06, ZG], 0.12, '#e9eee6');
  line([GW, 0, ZG], [GW, GH + 0.06, ZG], 0.12, '#e9eee6');
  line([-GW - 0.06, GH, ZG], [GW + 0.06, GH, ZG], 0.12, '#f4f7f1');
  line([-GW + 0.03, 0, ZG], [-GW + 0.03, GH, ZG], 0.03, 'rgba(0,0,0,.25)');
  line([GW + 0.03, 0, ZG], [GW + 0.03, GH, ZG], 0.03, 'rgba(0,0,0,.25)');
  ctx.lineCap = 'round';
}
function drawBall(b){
  var P = proj([b.x, b.y, b.z]), r = BR * P[2];
  var g = ctx.createRadialGradient(P[0] - r*0.35, P[1] - r*0.4, r*0.1, P[0], P[1], r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9cec7');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P[0], P[1], r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.22); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(P[0], P[1], r, 0, Math.PI*2); ctx.clip();
  ctx.fillStyle = '#1b1f1c';
  for (var i = 0; i < 3; i++){
    var a = b.spin + i * 2.09, px = P[0] + Math.cos(a) * r * 0.55, py = P[1] + Math.sin(a * 0.7 + 1) * r * 0.5;
    ctx.beginPath(); ctx.arc(px, py, r * 0.3, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function tag(J, text, col){
  var H = proj(J.head);
  ctx.font = '12px "Lilita One",sans-serif';
  var w = ctx.measureText(text.toUpperCase()).width + 14, x = H[0] - w / 2, y = H[1] - 0.2 * H[2] - 24;
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, 18, 6) : ctx.rect(x, y, w, 18); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeText(text.toUpperCase(), H[0], y + 9.5);
  ctx.fillStyle = '#fff'; ctx.fillText(text.toUpperCase(), H[0], y + 9.5);
}
// Big cartoon caption with an ink outline.

function render(t){
  if (!S || !cv.width) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  var plan = A.plan, r = t - TC;
  var sh = shooter(), kp = keeper();
  var SJ = body(shooterPose(t, plan));
  var KJ = body(keeperPose(r, plan));
  var b = ballAt(r, plan, KJ);
  var sKit = {shirt:KITC[sh], shorts:'#f4f6f2', socks:KITC[sh], skin:'#c58f63', hair:'#2b1d14', num: sh === 0 ? '10' : '9'};
  var kKit = {shirt:KITC[kp], shorts:'#111a15', socks:KITC[kp], skin:'#e0b088', hair:'#5a3b22', keeper:true};

  figureShadow(KJ); figureShadow(SJ);
  shadow(b.x, b.z, 0.13, Math.max(0.05, 0.45 - b.y * 0.15));

  var items = [
    {z: ZN, f: function(){ drawNet(b); }},
    {z: ZG, f: drawFrame},
    {z: KJ.pelvis[2], f: function(){ drawFigure(KJ, kKit); }},
    {z: b.z + (b.held ? -0.3 : 0), f: function(){ drawBall(b); }},
    {z: SJ.pelvis[2], f: function(){ drawFigure(SJ, sKit); }}
  ];
  items.sort(function(a, c){ return c.z - a.z; }).forEach(function(it){ it.f(); });

  if (!A.playing && A.freeze == null){
    tag(KJ, pname(kp), KITC[kp]);
    tag(SJ, pname(sh), KITC[sh]);
  }
}
