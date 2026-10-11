/* Duelist · js/core.js
   GAME FLOW: turns, picks, scoreboard, timer, reveal, results, tutorial. */

/* =====================================================================
   GAME FLOW
   S.game  = game being played now: pen | rps | tug | box | qd
   S.kind  = what was chosen in the menu (one of those, or 'mix')
   S.kicks = the turns played so far in this game
   S.series (Mixed Duel) = {order: 3 different games, idx, results[]}
   ===================================================================== */
var KIT = ['var(--blue)', 'var(--orange)'];
var HUB = {game: 'pen'};
var TIMER_S = 10;
var SVGI = function(d, extra){ return '<svg viewBox="0 0 24 24" fill="none" stroke="#1b1236" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + (extra || '') + '</svg>'; };
var ICONS = {
  left: SVGI('<path d="M15 5l-7 7 7 7"/>'), mid: SVGI('<path d="M5 15l7-7 7 7"/>'), right: SVGI('<path d="M9 5l7 7-7 7"/>'),
  rock: SVGI('<rect x="4" y="8" width="14" height="11" rx="4.5"/><path d="M8 8V6.5a2 2 0 0 1 4 0V8M12 8V6a2 2 0 0 1 4 0v2.5"/><path d="M18 11.5h1a2 2 0 0 1 0 4h-1"/>'),
  paper: SVGI('<path d="M7 20h8a3 3 0 0 0 3-3v-6"/><path d="M7 20c-2 0-3-1.5-3-3v-6M7 13V5a1.5 1.5 0 0 1 3 0v7M10 11V3.5a1.5 1.5 0 0 1 3 0V11M13 11V4.5a1.5 1.5 0 0 1 3 0V12M16 11V7a1.5 1.5 0 0 1 3 0v4"/>'),
  scissors: SVGI('<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9 15L18 3M15 15L6 3"/>'),
  jab: SVGI('<path d="M3 12h11M10 8l4 4-4 4"/><circle cx="19" cy="12" r="3"/>'),
  hook: SVGI('<path d="M5 19c0-8 5-13 13-13"/><path d="M14 3l4 3-4 3"/>'),
  upper: SVGI('<path d="M9 21V9M5 13l4-4 4 4"/><circle cx="16" cy="6" r="3"/>'),
  high: SVGI('<rect x="6" y="3" width="12" height="7" rx="2"/><circle cx="12" cy="14" r="2.5"/><path d="M12 17v4"/>'),
  low: SVGI('<circle cx="12" cy="5" r="2.5"/><path d="M12 8v3"/><rect x="6" y="13" width="12" height="7" rx="2"/>'),
  duck: SVGI('<path d="M4 20h16"/><circle cx="12" cy="13" r="2.5"/><path d="M8 5l4 4 4-4"/>'),
  rope: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M3 22c9-5 19-5 28 0" fill="none" stroke="#1b1236" stroke-width="7" stroke-linecap="round"/><path d="M3 22c9-5 19-5 28 0" fill="none" stroke="#d9a35c" stroke-width="3.5" stroke-linecap="round"/></svg>',
  glove: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M8 17c0-7 4-12 11-12s10 5 10 11-3 9-7 10H12c-2 0-4-2-4-4z" fill="#fff" stroke="#1b1236" stroke-width="2.5"/><rect x="11" y="25" width="15" height="6" rx="2" fill="#1b1236"/></svg>',
  hat: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M3 22c4-2 7-2 9-2 1-8 4-12 5-12s4 4 5 12c2 0 5 0 9 2-6 4-22 4-28 0z" fill="#8b4a1f" stroke="#1b1236" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  ball: '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="14" fill="#fff" stroke="#1b1236" stroke-width="2.5"/><polygon points="17,11 22.5,15 20.5,21.5 13.5,21.5 11.5,15" fill="#1b1236"/></svg>',
  gloveK: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="9" y="12" width="16" height="17" rx="5" fill="#fff" stroke="#1b1236" stroke-width="2.5"/><path d="M11 13V6M15 12V4M19 12V4M23 13V7" stroke="#1b1236" stroke-width="3" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="7" y="11" width="18" height="16" rx="6" fill="#f2c39c" stroke="#1b1236" stroke-width="2.5"/><rect x="10" y="6" width="13" height="8" rx="4" fill="#ffd9b8" stroke="#1b1236" stroke-width="2.5"/></svg>'
};
var TUTORIAL = {
  pen: {t: 'PENALTY DUEL', s: ['Take turns: one shoots, the other keeps goal.', 'Both secretly pick left, middle or right.', 'Same side = saved, different side = goal. 5 kicks each, then sudden death.']},
  rps: {t: 'ROCK PAPER SCISSORS', s: ['Both throw at the same time, in secret.', 'Rock beats scissors, scissors beat paper, paper beats rock.', 'First to win 3 rounds wins. Draws are replayed.']},
  tug: {t: 'TUG OF WAR', s: ['You each get 100 strength for the whole match.', 'Every round, secretly choose how hard to pull. The bigger pull moves the rope one step.', 'Spent strength is gone. Equal pulls: the rope doesn’t move. If you both run out, you each get 10 more. Drag the rope 3 steps your way to win.']},
  box: {t: 'BOXING', s: ['You each start with 100 health. Every turn, pick a punch AND a guard.', 'Jab hits for 15, hook 22, uppercut 30.', 'High guard stops jabs, duck stops hooks, low guard stops uppercuts. A blocked punch costs the puncher 5, 10 or 15. Knock them out, or lead after 8 turns. Still level? Keep fighting until someone leads.']},
  qd: {t: 'QUICK DRAW', s: ['Keep your hands off the screen until it says DRAW!', 'Then tap as fast as you can. The faster finger wins the draw.', 'Tap too early (or faster than 0.1 s, which only a guess can do) and you lose that draw. First to 3 wins.']}
};

function rand(){ return Math.floor(Math.random() * 3); }
function shooter(){ return S.kicks.length % 2; }
function keeper(){ return 1 - shooter(); }
function pname(p){ return S.names[p]; }
function isMe(p){ return S.mode === 'cpu' ? p === 0 : S.mode === 'online' ? p === S.me : false; }
function winner(){ return winnerOf(S.game, S.kicks); }
function seriesWins(){ var w = [0,0]; if (S.series) S.series.results.forEach(function(r){ if (r === 0 || r === 1) w[r]++; }); return w; }
function shuffle3(){
  var a = GAME_IDS.slice();
  for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
  return a.slice(0, 3);
}

/* ---------- scoreboard ---------- */
function dotEl(state){
  var d = document.createElement('span');
  d.className = 'dot' + (state === 1 ? ' scored' : state === -1 ? ' missed' : '');
  if (state === 1) d.innerHTML = CHECK; else if (state === -1) d.innerHTML = CROSS;
  return d;
}
function renderBoard(over){
  var n = S.kicks.length, g = S.game, label = '', score = [0, 0], mid = '';
  $('nm0').textContent = pname(0); $('nm1').textContent = pname(1);
  $('board').classList.remove('long');
  [0, 1].forEach(function(p){ $('dots' + p).innerHTML = ''; });
  if (g === 'pen' || g === 'pensd'){
    var r = penTally(S.kicks), base = 5, extraN = Math.max(0, n - 10);
    var sdRounds = n < 10 ? 0 : (over ? Math.ceil(extraN / 2) : Math.floor(extraN / 2) + 1);
    var slots = base + sdRounds, MAXSD = 4, firstSd = Math.max(0, sdRounds - MAXSD);
    if (sdRounds > 1) $('board').classList.add('long');
    [0, 1].forEach(function(p){
      var mine = S.kicks.filter(function(k){ return k.shooter === p; }), box = $('dots' + p);
      for (var i = 0; i < slots; i++){
        if (i >= base && i - base < firstSd) continue;
        if (i === base){ var sep = document.createElement('span'); sep.className = 'sdsep'; box.appendChild(sep); }
        if (i === base + firstSd && firstSd > 0){ var more = document.createElement('span'); more.className = 'more'; more.textContent = '+' + firstSd; box.appendChild(more); }
        box.appendChild(dotEl(i < mine.length ? (mine[i].goal ? 1 : -1) : 0));
      }
    });
    score = r.g; mid = n < 10 ? 'Round ' + (Math.floor(n / 2) + 1) : 'Sudden death';
  } else if (g === 'rps' || g === 'qd'){
    var w = roundWins(S.kicks), to = g === 'rps' ? RPS_TO : QD_TO;
    [0, 1].forEach(function(p){ for (var i = 0; i < to; i++) $('dots' + p).appendChild(dotEl(i < w[p] ? 1 : 0)); });
    score = w; mid = (g === 'rps' ? 'Round ' : 'Draw ') + (n + 1);
  } else if (g === 'tug'){
    var st = tugReplay(S.kicks);
    [0, 1].forEach(function(p){
      var steps = p === 0 ? Math.max(0, -st.pos) : Math.max(0, st.pos);
      for (var i = 0; i < TUG_WIN; i++) $('dots' + p).appendChild(dotEl(i < steps ? 1 : 0));
    });
    score = st.left; mid = 'Strength';
  } else if (g === 'box'){
    var hp = boxHp(S.kicks);
    [0, 1].forEach(function(p){
      var bar = document.createElement('span'); bar.className = 'hp';
      var fill = document.createElement('i'); fill.style.width = Math.max(0, hp[p]) + '%';
      fill.style.background = hp[p] > 50 ? '#3ee06a' : hp[p] > 25 ? '#ffd84a' : '#ff4d5e';
      bar.appendChild(fill); $('dots' + p).appendChild(bar);
    });
    score = [Math.max(0, hp[0]), Math.max(0, hp[1])]; mid = n < BOX_TURNS ? 'Turn ' + (n + 1) + '/' + BOX_TURNS : 'Extra turn';
  }
  $('dots0').style.width = g === 'box' ? '100%' : ''; $('dots1').style.width = g === 'box' ? '100%' : '';
  $('score').textContent = score[0] + ':' + score[1];
  $('midLabel').textContent = over ? 'Full time' : mid;
  label = GAME_NAME[g];
  if (S.series){ var sw = seriesWins(); label = 'Game ' + (S.series.idx + 1) + ' of 3 · Duel ' + sw[0] + '–' + sw[1] + ' · ' + label; }
  if (S.mode === 'online') label += ' · ' + S.code;
  $('kickLabel').textContent = label;
}

/* ---------- controls ---------- */
function setControls(mode){
  // mode: 'pick' | 'wait' | 'none' | 'next' | 'nextgame' | 'over'
  var pickNow = mode === 'pick';
  $('pickArea').hidden = !pickNow;
  $('role').hidden = !pickNow;
  $('waitbar').hidden = mode !== 'wait';
  $('nextBtn').hidden = mode !== 'next';
  $('nextGameBtn').hidden = mode !== 'nextgame';
  $('rematchBtn').hidden = mode !== 'over';
  $('social').hidden = !(S && S.mode === 'online');
  if (!pickNow) stopTimer();
  updateQuit();
}
function showWait(title, sub){ $('waitTitle').textContent = title; $('waitSub').textContent = sub; setControls('wait'); }
function banner(who, icon, title, sub){
  $('role').style.background = KIT[who];
  $('roleIcon').innerHTML = icon.replace(/^<svg viewBox="0 0 24 24"/, '<svg viewBox="-5 -5 34 34"');
  $('roleTitle').textContent = title; $('roleSub').textContent = sub;
}
function pickBtn(icon, label, on){
  var b = document.createElement('button'); b.type = 'button'; b.className = 'pick';
  b.innerHTML = icon; var s = document.createElement('span'); s.textContent = label; b.appendChild(s);
  b.addEventListener('click', on);
  return b;
}

// Build the pick buttons for whoever picks now.
function setPhase(seat){
  S.phase = 'pick'; S.picker = seat;
  var g = S.game, area = $('pickArea'), n = S.kicks.length, me = isMe(seat) || S.mode === 'local';
  var who = function(you, other){ return isMe(seat) ? you : pname(seat) + other; };
  area.innerHTML = '';
  if (g === 'pen' || g === 'pensd'){
    var shoot = shooter() === seat;
    banner(seat, shoot ? ICONS.ball : ICONS.gloveK, shoot ? who('YOU’RE SHOOTING!', ' SHOOTS') : who('YOU’RE IN GOAL!', ' IN GOAL'), shoot ? 'Pick where to aim the ball.' : 'Pick where to dive.');
    var row = document.createElement('div'); row.className = 'picks';
    [['left', 'LEFT'], ['mid', 'MIDDLE'], ['right', 'RIGHT']].forEach(function(it, i){ row.appendChild(pickBtn(ICONS[it[0]], it[1], function(){ onPick(i); })); });
    area.appendChild(row);
  } else if (g === 'rps'){
    banner(seat, ICONS.hand, who('YOUR THROW!', '’S THROW'), 'Pick rock, paper or scissors.');
    var r2 = document.createElement('div'); r2.className = 'picks';
    [['rock', 'ROCK'], ['paper', 'PAPER'], ['scissors', 'SCISSORS']].forEach(function(it, i){ r2.appendChild(pickBtn(ICONS[it[0]], it[1], function(){ onPick(i); })); });
    area.appendChild(r2);
  } else if (g === 'tug'){
    var left = tugLeft(S.kicks)[seat];
    banner(seat, ICONS.rope, who('HOW HARD DO YOU PULL?', ' PULLS'), 'Strength left: ' + left + '. Spent strength is gone.');
    area.appendChild(bidPanel(left));
  } else if (g === 'box'){
    banner(seat, ICONS.glove, who('YOUR MOVE!', '’S MOVE'), 'Pick a punch and a guard, then FIGHT.');
    area.appendChild(boxPanel());
  } else if (g === 'qd'){
    banner(seat, ICONS.hat, 'GET READY', 'Tap I’M READY. Then wait for DRAW!');
    var rb = document.createElement('button'); rb.type = 'button'; rb.className = 'btn y big'; rb.textContent = 'I’M READY';
    rb.addEventListener('click', function(){ onPick('ready'); });
    area.appendChild(rb);
  }
  setControls('pick');
  if (S.mode === 'online') startTimer();
}

function bidPanel(max){
  var wrap = document.createElement('div'); wrap.className = 'bid';
  if (max <= 0){
    var p = document.createElement('p'); p.style.margin = '0'; p.style.fontWeight = '900';
    p.textContent = 'You’re out of strength this round. Hold the rope and hope!';
    var hb = document.createElement('button'); hb.type = 'button'; hb.className = 'btn y big'; hb.textContent = 'HOLD ON';
    hb.addEventListener('click', function(){ onPick(0); });
    wrap.appendChild(p); wrap.appendChild(hb); return wrap;
  }
  var start = Math.min(max, Math.max(1, Math.round(max * 0.25)));
  var head = document.createElement('div'); head.className = 'bidnum';
  var num = document.createElement('b'); num.textContent = start;
  var lab = document.createElement('span'); lab.textContent = 'of ' + max + ' strength';
  head.appendChild(num); head.appendChild(lab);
  var rng2 = document.createElement('input'); rng2.type = 'range'; rng2.min = 0; rng2.max = max; rng2.step = 1; rng2.value = start; rng2.id = 'bidRange';
  rng2.setAttribute('aria-label', 'Pull strength');
  var set = function(v){ v = Math.max(0, Math.min(max, v)); rng2.value = v; num.textContent = v; };
  rng2.addEventListener('input', function(){ num.textContent = rng2.value; });
  var steps = document.createElement('div'); steps.className = 'steps';
  [-10, -1, 1, 10].forEach(function(d){
    var b = document.createElement('button'); b.type = 'button'; b.textContent = (d > 0 ? '+' : '−') + Math.abs(d);
    b.addEventListener('click', function(){ set(Number(rng2.value) + d); haptic('tap'); });
    steps.appendChild(b);
  });
  var go = document.createElement('button'); go.type = 'button'; go.className = 'btn o big ols'; go.textContent = 'PULL!';
  go.addEventListener('click', function(){ onPick(Number(rng2.value)); });
  wrap.appendChild(head); wrap.appendChild(rng2); wrap.appendChild(steps); wrap.appendChild(go);
  return wrap;
}

function boxPanel(){
  var wrap = document.createElement('div'); wrap.className = 'pickset';
  var sel = {a: null, g: null};
  var go = document.createElement('button'); go.type = 'button'; go.className = 'btn o big ols'; go.textContent = 'FIGHT!'; go.disabled = true;
  function row(title, items, key){
    var h = document.createElement('h4'); h.className = 'ols'; h.textContent = title;
    var r = document.createElement('div'); r.className = 'picks';
    items.forEach(function(it, i){
      var b = pickBtn(ICONS[it[0]], it[1], function(){
        sel[key] = i; haptic('tap');
        Array.prototype.forEach.call(r.children, function(x, j){ x.classList.toggle('on', j === i); });
        go.disabled = sel.a === null || sel.g === null;
      });
      r.appendChild(b);
    });
    wrap.appendChild(h); wrap.appendChild(r);
  }
  row('PUNCH', [['jab', 'JAB 15'], ['hook', 'HOOK 22'], ['upper', 'UPPER 30']], 'a');
  row('GUARD', [['high', 'HIGH'], ['low', 'LOW'], ['duck', 'DUCK']], 'g');
  go.addEventListener('click', function(){ if (sel.a !== null && sel.g !== null) onPick(sel.a * 3 + sel.g); });
  wrap.appendChild(go);
  return wrap;
}

/* ---------- pick timer (online only) ---------- */
var Tm = {id: null, end: 0, ticked: 0, pending: false};
function startTimer(){
  stopTimer();
  if (!$('tut').hidden){ Tm.pending = true; return; }
  Tm.end = performance.now() + TIMER_S * 1000; Tm.ticked = 0;
  $('roleTimer').hidden = false;
  Tm.id = setInterval(function(){
    var left = (Tm.end - performance.now()) / 1000;
    $('roleTimerBar').style.width = Math.max(0, left / TIMER_S * 100) + '%';
    if (left <= 3 && !$('tut').hidden){ $('tut').hidden = true; }   // "How to play" opened mid-pick: get it out of the way so the pick isn't lost
    if (left <= 3 && left > 0 && Math.ceil(left) !== Tm.ticked){ Tm.ticked = Math.ceil(left); SFX.tick(); }
    if (left <= 0){ stopTimer(); autoPick(); }
  }, 100);
}
function stopTimer(){ if (Tm.id){ clearInterval(Tm.id); Tm.id = null; } Tm.pending = false; $('roleTimer').hidden = true; }
function autoPick(){
  var g = S.game, v;
  if (g === 'qd') v = 'ready';
  else if (g === 'tug'){ var r = document.getElementById('bidRange'); v = r ? Number(r.value) : 0; }
  else if (g === 'box') v = rand() * 3 + rand();
  else v = rand();
  onPick(v, true);
}

function showHandoff(p, then){
  setControls('none');
  $('handTitle').textContent = 'PASS TO ' + pname(p).toUpperCase();
  $('handTitle').style.color = KITC[p];
  $('handSub').textContent = 'Your turn to pick. Keep it hidden from ' + pname(1 - p) + '.';
  $('handBtn').textContent = 'I’M ' + pname(p).toUpperCase();
  $('handoff').hidden = false;
  $('handBtn').onclick = function(){ $('handoff').hidden = true; then(); };
}

function flash(big, color, small){
  $('flashBig').textContent = big;
  $('flashBig').style.color = color;
  $('flashSmall').textContent = small || '';
  $('flashSmall').hidden = !small;
  $('flash').hidden = false;
}

/* ---------- a turn ---------- */
function beginTurn(){
  stopTimer();
  A.playing = false; A.plan = null; A.rps = null; A.tug = null; A.box = null; A.qd = null; A.done = true; A.ev = [];
  $('flash').hidden = true; $('skipHint').hidden = true; $('handoff').hidden = true;
  S.pa = null; S.pb = null; S.phase = null; S.qdLive = null; S.qdPending = false;
  $('helpBtn').hidden = false;
  $('pickArea').innerHTML = '';
  var w = winner();
  renderBoard(w !== null);
  if (w !== null){ finishGame(w, null); return; }
  maybeTutorial(S.game);
  if (S.mode === 'online'){ netStep(); return; }
  if (S.game === 'qd'){
    if (S.mode === 'cpu') setPhase(0);
    else if (!$('tut').hidden){ S.qdPending = true; setControls('none'); }   // start the draw once "How to play" is closed
    else startQd();
    return;
  }
  if (S.mode === 'cpu'){ setPhase(0); return; }
  var first = (S.game === 'pen' || S.game === 'pensd') ? shooter() : 0;
  S.localOrder = [first, 1 - first];
  showHandoff(first, function(){ setPhase(first); });
}

function onPick(v, auto){
  stopTimer();
  haptic('tap');
  if (S.game === 'qd' && v === 'ready'){
    if (S.mode === 'online') netReady2(); else startQd();
    return;
  }
  if (S.mode === 'online'){ if (S.phase === 'pick') netCommit(v, auto); return; }
  var seat = S.picker;
  if (seat === 0) S.pa = v; else S.pb = v;
  if (S.mode === 'cpu'){ S.pb = RULES[S.game].cpu(S.kicks.length, S.kicks); resolveTurn(); return; }
  var second = S.localOrder[1];
  if (seat !== second){ showHandoff(second, function(){ setPhase(second); }); return; }
  resolveTurn();
}

function resolveTurn(){
  var n = S.kicks.length, R = RULES[S.game];
  var p0 = R.valid(n, 0, S.pa, S.kicks), p1 = R.valid(n, 1, S.pb, S.kicks);
  reveal(R.resolve(n, p0, p1, S.kicks));
}

/* ---------- Quick Draw live sequence ---------- */
function startQd(delayMs){
  setControls('none');
  var now = performance.now(), delay = delayMs != null ? delayMs : 1400 + Math.random() * 2600;
  S.qdLive = {phase: 'ready', start: now, steadyAt: now + 900, drawAt: now + 900 + delay, drawShown: null, taps: [null, null]};
  if (S.mode === 'cpu'){
    var cpu = RULES.qd.cpu();
    if (cpu < 0) S.qdLive.cpuEarlyAt = now + 900 + Math.random() * delay * 0.9; else S.qdLive.cpuMs = cpu;
  }
  var area = $('pickArea'); area.innerHTML = '';
  if (S.mode === 'local'){
    var pads = document.createElement('div'); pads.className = 'qdpads';
    [0, 1].forEach(function(p){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (p === 0 ? 'b' : 'o') + ' ols';
      b.textContent = pname(p).toUpperCase() + ': TAP!';
      b.addEventListener('pointerdown', function(e){ e.preventDefault(); qdTap(p); });
      pads.appendChild(b);
    });
    area.appendChild(pads);
    banner(0, ICONS.hat, 'BOTH: THUMBS READY', 'Blue taps left, orange taps right. Wait for DRAW!');
  } else {
    banner(S.mode === 'online' ? S.me : 0, ICONS.hat, 'HANDS OFF…', 'Tap anywhere on the picture when it says DRAW!');
  }
  $('pickArea').hidden = S.mode !== 'local';
  $('role').hidden = false; $('waitbar').hidden = true;
  S.phase = 'qd';
  $('helpBtn').hidden = true;
  SFX.wind();
}
function qdTick(now){
  var L = S.qdLive; if (!L || L.done) return;
  if (L.phase === 'ready' && now >= L.steadyAt){ L.phase = 'steady'; }
  if (L.phase === 'steady' && L.cpuEarlyAt && now >= L.cpuEarlyAt && L.taps[1] == null){ L.taps[1] = -1; }
  if (L.phase === 'steady' && now >= L.drawAt){ L.phase = 'draw'; L.drawShown = now; SFX.snap(); haptic('heavy'); }
  if (L.phase === 'draw'){
    if (S.mode === 'cpu' && L.taps[1] == null && L.cpuMs != null && now - L.drawShown >= L.cpuMs) L.taps[1] = L.cpuMs;
    if (now - L.drawShown > 2500){ [0, 1].forEach(function(p){ if (L.taps[p] == null) L.taps[p] = 9999; }); }
  }
  var mine = S.mode === 'online' ? S.me : 0;
  if (S.mode === 'online'){ if (L.taps[mine] != null) qdFinish(); return; }
  if (L.taps[0] === -1 || L.taps[1] === -1){ [0, 1].forEach(function(p){ if (L.taps[p] == null) L.taps[p] = 9998; }); }
  if (L.taps[0] != null && L.taps[1] != null) qdFinish();
}
function qdTap(p){
  var L = S.qdLive; if (!L || L.done || L.taps[p] != null) return;
  if (L.phase !== 'draw'){ L.taps[p] = -1; haptic('error'); SFX.block(); return; }
  var ms = Math.round(performance.now() - L.drawShown);
  if (ms < 100){ L.taps[p] = -1; haptic('error'); SFX.block(); return; }   // faster than a human can react = guessed early
  L.taps[p] = ms;
  SFX.bang(); haptic('heavy');
}
function qdFinish(){
  var L = S.qdLive; L.done = true;
  $('helpBtn').hidden = false;
  if (S.mode === 'online'){ var my = L.taps[S.me]; S.qdLive = null; netCommit(my); return; }
  S.pa = L.taps[0]; S.pb = L.taps[1];
  S.qdLive = null;
  resolveTurn();
}

/* ---------- the reveal animation of one turn ---------- */
function reveal(turn){
  S.phase = 'reveal';
  setControls('none');
  $('role').hidden = true;
  $('skipHint').hidden = false;
  var g = S.game, n = S.kicks.length;
  A.plan = null; A.rps = null; A.tug = null; A.box = null; A.qd = null;
  if (g === 'pen' || g === 'pensd'){
    A.plan = makePlan(turn.shot, turn.dive); A.resultT = RESULT_T;
    schedule([[0.05, SFX.whistle], [TC, function(){ SFX.kick(); haptic('medium'); }],
      [TC + TF, function(){ if (turn.goal){ SFX.net(); SFX.cheer(); haptic('success'); } else { SFX.glove(); SFX.groan(); haptic('rigid'); } }, true]]);
  } else if (g === 'rps'){
    A.rps = {a: turn.a, b: turn.b, w: turn.w}; A.resultT = RPS_RESULT_T;
    schedule([[0.0, SFX.thump], [PUMP, SFX.thump], [PUMP * 2, SFX.thump],
      [RPS_REVEAL, function(){ SFX.snap(); haptic('medium'); }],
      [RPS_REVEAL + 0.45, function(){ if (turn.w === null) SFX.draw(); else SFX.win(); }, true]]);
  } else if (g === 'tug'){
    A.tug = turn; A.resultT = 1.75;
    schedule([[0.0, SFX.heave], [0.45, SFX.pop], [0.75, function(){ if (turn.w !== null){ SFX.slide(); haptic('heavy'); } else SFX.draw(); }, true]]);
  } else if (g === 'box'){
    A.box = turn; A.resultT = turn.ko !== null ? 2.3 : 1.55;
    schedule([[0.0, SFX.bell], [0.5, function(){ if (turn.hit[0] || turn.hit[1]){ SFX.punch(); haptic('heavy'); } if (!turn.hit[0] || !turn.hit[1]) SFX.block(); }],
      [1.05, function(){ if (turn.ko !== null){ SFX.punch(); SFX.cheer(); haptic('error'); } }, true]]);
  } else if (g === 'qd'){
    A.qd = turn; A.resultT = 1.7;
    schedule([[0.1, function(){ if (turn.w !== null){ SFX.bang(); haptic('heavy'); } }], [0.6, function(){ if (turn.w !== null) SFX.win(); else SFX.draw(); }, true]]);
  }
  A.onDone = function(){
    S.kicks.push(turn);
    var f = turnFlash(g, turn);
    afterTurn(f[0], f[1], f[2]);
  };
  A.playing = true; A.done = false;
  A.start = performance.now() - (REDUCED ? A.resultT * 1000 : 0);
}

function cap1(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function turnFlash(g, turn){
  var W = turn.w, col = W === null ? '#ffffff' : KITC[W];
  if (g === 'pen' || g === 'pensd') return [turn.goal ? 'GOAL!' : 'SAVED!', turn.goal ? KITC[turn.shooter] : KITC[1 - turn.shooter], SHOT_TXT[turn.shot] + ', ' + DIVE_TXT[turn.dive] + '.'];
  if (g === 'rps'){
    var line = W === null ? 'Both threw ' + SIGN[turn.a] + '. Round replayed.' : cap1(SIGN[W === 0 ? turn.a : turn.b] + ' beats ' + SIGN[W === 0 ? turn.b : turn.a] + '.');
    return [W === null ? 'DRAW!' : (isMe(W) ? 'YOU WIN THE ROUND!' : pname(W).toUpperCase() + ' WINS THE ROUND!'), col, line];
  }
  if (g === 'tug') return [W === null ? 'STALEMATE!' : (isMe(W) ? 'YOU PULL!' : pname(W).toUpperCase() + ' PULLS!'), col, pname(0) + ' pulled ' + turn.b0 + ', ' + pname(1) + ' pulled ' + turn.b1 + '.'];
  if (g === 'box'){
    var parts = [0, 1].map(function(i){ var j = 1 - i; return pname(i) + '’s ' + PUNCH[turn.a[i]] + (turn.hit[i] ? ' landed: −' + turn.dmg[i] + ' to ' + pname(j) : ' was blocked: −' + turn.dmg[i] + ' back to ' + pname(i)); });
    var big = turn.hit[0] && turn.hit[1] ? 'TRADE!' : turn.hit[0] ? pname(0).toUpperCase() + ' LANDS!' : turn.hit[1] ? pname(1).toUpperCase() + ' LANDS!' : 'DOUBLE BLOCK!';
    return [big, col, parts.join('. ') + '.'];
  }
  if (g === 'qd'){
    var t = function(i){ var m = turn.ms[i]; return m < 0 ? 'too early' : m >= 9998 ? 'no shot' : (m / 1000).toFixed(3) + ' s'; };
    if (W === null) return ['NO WINNER', '#ffffff', turn.why === 'early' ? 'Both drew too early. Draw again.' : turn.ms[0] >= 9998 ? 'Nobody fired. Draw again.' : 'Dead heat: ' + t(0) + ' each. Draw again.'];
    if (turn.why === 'early') return [pname(1 - W).toUpperCase() + ' DREW TOO EARLY!', KITC[W], pname(W) + ' wins the draw.'];
    return [(isMe(W) ? 'YOU' : pname(W).toUpperCase()) + ' DRAW FIRST!', col, pname(0) + ' ' + t(0) + ' vs ' + pname(1) + ' ' + t(1) + '.'];
  }
  return ['', '#fff', ''];
}

function afterTurn(big, color, small){
  var w = winner();
  renderBoard(w !== null);
  if (w === null){
    flash(big, color, small);
    S.phase = 'result';
    $('nextBtn').textContent = S.game === 'qd' ? 'NEXT DRAW' : S.game === 'pen' || S.game === 'pensd' ? 'NEXT KICK' : S.game === 'box' ? 'NEXT TURN' : 'NEXT ROUND';
    setControls('next');
  } else {
    finishGame(w, small);
  }
}

function winLine(p){ return S.mode === 'cpu' ? (p === 0 ? 'YOU WIN!' : 'COMPUTER WINS') : isMe(p) ? 'YOU WIN!' : pname(p).toUpperCase() + ' WINS!'; }
function scoreLine(){
  var g = S.game;
  if (g === 'rps' || g === 'qd'){ var w = roundWins(S.kicks); return 'Final score ' + w[0] + '–' + w[1] + '.'; }
  if (g === 'tug'){ var st = tugReplay(S.kicks); return 'Rope dragged ' + TUG_WIN + ' steps. Strength left ' + st.left[0] + '–' + st.left[1] + '.'; }
  if (g === 'box'){
    var hp = boxHp(S.kicks), bw = winner();
    if (hp[0] <= 0 && hp[1] <= 0) return 'Double knockout! ' + (bw === null ? '' : pname(bw) + ' went down last.');
    return (hp[0] <= 0 || hp[1] <= 0 ? 'Knockout! ' : 'On points. ') + 'Health ' + Math.max(0, hp[0]) + '–' + Math.max(0, hp[1]) + '.';
  }
  var r = penTally(S.kicks);
  return 'Final score ' + r.g[0] + '–' + r.g[1] + (S.kicks.length > 10 ? ' after sudden death.' : '.');
}

function finishGame(w, lastLine, forfeit){
  if (S.phase === 'over' || S.phase === 'subover') return;
  var h2h = '';
  if (S.series && !forfeit){
    S.series.results[S.series.idx] = w;
    var sw = seriesWins();
    renderBoard(true);
    if (sw[0] === 2 || sw[1] === 2){
      var sWin = sw[0] === 2 ? 0 : 1;
      h2h = recordResult('mix', sWin);
      flash(S.mode === 'cpu' ? (sWin === 0 ? 'YOU WIN THE DUEL!' : 'COMPUTER WINS THE DUEL') : (isMe(sWin) ? 'YOU WIN THE DUEL!' : pname(sWin).toUpperCase() + ' WINS THE DUEL!'),
            KITC[sWin], 'Mixed Duel ' + sw[0] + '–' + sw[1] + '. ' + GAME_NAME[S.game] + ': ' + scoreLine() + h2h);
      S.phase = 'over'; setControls('over'); SFX.fanfare(); haptic('success');
    } else {
      var nextG = S.series.order[S.series.idx + 1];
      flash((isMe(w) ? 'YOU TAKE' : pname(w).toUpperCase() + ' TAKES') + ' GAME ' + (S.series.idx + 1) + '!', KITC[w], GAME_NAME[S.game] + ': ' + scoreLine() + ' Duel ' + sw[0] + '–' + sw[1] + '.');
      $('nextGameBtn').textContent = 'NEXT: ' + GAME_NAME[nextG].toUpperCase();
      S.phase = 'subover'; setControls('nextgame'); SFX.win();
    }
    return;
  }
  h2h = recordResult(S.series ? 'mix' : S.game === 'pensd' ? 'pen' : S.game, w);
  flash(forfeit ? (isMe(w) ? 'YOU WIN!' : 'YOU FORFEITED') : winLine(w), KITC[w],
        forfeit ? (isMe(w) ? pname(1 - w) + ' left the match. It counts as a win for you.' : 'You left the match, so it counts as a loss.') + h2h : (lastLine ? lastLine + ' ' : '') + scoreLine() + h2h);
  S.phase = 'over';
  setControls('over');
  if (isMe(w) || S.mode === 'local'){ SFX.fanfare(); haptic('success'); } else { SFX.groan(); haptic('error'); }
}

function startSub(idx){
  S.series.idx = idx;
  S.game = S.series.order[idx];
  S.kicks = [];
  beginTurn();
}

function start(mode){
  var kind = HUB.game;
  S = {mode: mode, kind: kind, names: mode === 'cpu' ? [nick() || 'You', 'Computer'] : ['Blue', 'Orange'], kicks: [], phase: null,
       matchId: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)};
  if (kind === 'mix'){ S.series = {order: shuffle3(), idx: 0, results: []}; S.game = S.series.order[0]; }
  else S.game = kind;
  showScreen('game');
  ambience(true);
  beginTurn();
}

// Coming back to the menu reloads the account (new online results), at most every 5 s.
var lastAcct = 0;
function refreshAccountSoon(){ if (!TG || Date.now() - lastAcct < 5000) return; lastAcct = Date.now(); loadAccount(); }
function showScreen(id){
  ['menu', 'lobby', 'game'].forEach(function(s){ $(s).hidden = s !== id; });
  tgBack(id !== 'menu');
  if (id !== 'game') ambience(false);
  if (id === 'menu'){ renderHub(); refreshAccountSoon(); }
  window.scrollTo(0, 0);
}

var quitArmed = false;
function onlineLive(){ return S && S.mode === 'online' && S.phase !== 'over' && !S.forfeited; }
function updateQuit(){
  quitArmed = false;
  $('quitBtn').textContent = onlineLive() ? 'Leave match (counts as a loss)' : 'Back to menu';
}
function toMenu(){
  if (onlineLive()){
    if (!quitArmed){ quitArmed = true; $('quitBtn').textContent = 'Tap again to leave and lose'; return; }
    netForfeit();
  }
  A.playing = false; A.plan = null;
  stopTimer();
  if (S && S.mode === 'online'){ netDetach(); forget(); }
  S = null;
  $('handoff').hidden = true; $('flash').hidden = true; $('tut').hidden = true; $('helpBtn').hidden = false;
  showScreen('menu');
}

/* ---------- tutorial (first time each game is played) ---------- */
var tutShown = {};
function maybeTutorial(g){
  if (g === 'pensd') g = 'pen';
  if (tutShown[g]) return;
  tutShown[g] = true;
  var seen = false; try { seen = localStorage.getItem('pd-tut-' + g) === '1'; } catch (e) {}
  if (!seen) openTutorial(g);
}
function openTutorial(g){
  if (g === 'pensd') g = 'pen';
  var T = TUTORIAL[g]; if (!T) return;
  $('tutTitle').textContent = T.t;
  $('tutSteps').innerHTML = '';
  T.s.forEach(function(s){ var li = document.createElement('li'); li.textContent = s; $('tutSteps').appendChild(li); });
  $('tut').hidden = false; $('tut').dataset.g = g;
  $('tutOk').focus({preventScroll: true});
}
function closeTutorial(){
  var g = $('tut').dataset.g;
  try { localStorage.setItem('pd-tut-' + g, '1'); } catch (e) {}
  $('tut').hidden = true;
  if (Tm.pending && S && S.phase === 'pick') startTimer();
  if (S && S.qdPending && S.game === 'qd' && !S.qdLive){ S.qdPending = false; startQd(); }
}
