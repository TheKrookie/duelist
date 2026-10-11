/* Duelist · js/loop.js
   Animation state and the frame loop that draws the current game. */

var A = {playing:false, start:0, plan:null, rps:null, ev:[], resultT:RESULT_T, done:true, onDone:null, freeze:null};

/* ---------- timed events inside an animation (sounds, haptics) ---------- */
function schedule(list){ A.ev = list.map(function(e){ return {t:e[0], f:e[1], last:!!e[2], done:false}; }); }
function runEvents(t){ (A.ev || []).forEach(function(e){ if (!e.done && t >= e.t){ e.done = true; e.f(); } }); }
function skipAnim(){
  if (!A.playing || A.done || A.freeze != null) return;
  (A.ev || []).forEach(function(e){ if (!e.done){ e.done = true; if (e.last) e.f(); } });
  A.start = performance.now() - A.resultT * 1000;
}

var RENDER = {pen: function(t){ render(t); }, pensd: function(t){ render(t); }, rps: function(t){ renderRps(t); }, tug: renderTug, box: renderBox, qd: renderQd};
var last = null;
function frame(now){
  requestAnimationFrame(frame);
  if ($('game').hidden){ last = now; return; }
  var dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now; clock += dt;
  resize();
  var t = A.freeze != null ? A.freeze : A.playing ? (now - A.start) / 1000 : 0;
  if (S && S.qdLive && !A.playing) qdTick(now);
  if (S && RENDER[S.game]) RENDER[S.game](t);
  if (A.playing && A.freeze == null) runEvents(t);
  if (A.playing && !A.done && t >= A.resultT){ A.done = true; $('skipHint').hidden = true; if (A.onDone) A.onDone(); }
}
requestAnimationFrame(frame);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ BGC = {}; if (cv.width) paintBg(); });
