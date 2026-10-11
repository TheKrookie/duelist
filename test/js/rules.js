/* Duelist · js/rules.js
   GAME RULES for all five games. Both phones use these to play out each turn. */

/* =====================================================================
   GAME RULES (one place for all five games)
   Every game is played in "turns". In each turn both players submit one
   secret number (their pick); resolve() turns the two picks into what
   happened, winnerOf() says if the match is over.
     pen  penalty kick: 0 left, 1 middle, 2 right (shooter aims, keeper dives)
     rps  0 rock, 1 paper, 2 scissors
     tug  how much strength to pull with this round (0..strength left)
     box  punch*3 + guard  (punch 0 jab,1 hook,2 uppercut; guard 0 high,1 low,2 duck)
     qd   reaction time in ms (-1 = tapped too early, 9999 = no tap)
   ===================================================================== */
var GAME_IDS = ['pen', 'rps', 'tug', 'box', 'qd'];
var GAME_NAME = {pen:'Penalty Duel', rps:'Rock Paper Scissors', tug:'Tug of War', box:'Boxing', qd:'Quick Draw', mix:'Mixed Duel', pensd:'Penalty Duel'};
var RPS_TO = 3, QD_TO = 3, TUG_WIN = 3, TUG_START = 100, TUG_OVERTIME = 10, BOX_HP = 100, BOX_TURNS = 8;
var BOX_HIT = [15, 22, 30], BOX_COUNTER = [5, 10, 15], BOX_BLOCKER = [0, 2, 1]; // jab<-high guard, hook<-duck, uppercut<-low guard
var PUNCH = ['jab', 'hook', 'uppercut'];

function rpsBeatsN(a, b){ return a === b ? null : ((a - b + 3) % 3 === 1 ? 0 : 1); }
function tugReplay(list){
  var pos = 0, left = [TUG_START, TUG_START], wins = [0, 0];
  list.forEach(function(r){
    left[0] -= r.b0; left[1] -= r.b1; pos += r.move;
    if (r.w === 0 || r.w === 1) wins[r.w]++;
    if (left[0] <= 0 && left[1] <= 0 && Math.abs(pos) < TUG_WIN){ left = [TUG_OVERTIME, TUG_OVERTIME]; }
  });
  return {pos: pos, left: left, wins: wins};
}
function tugPos(list){ return tugReplay(list).pos; }
function tugLeft(list){ return tugReplay(list).left; }
function boxHp(list){
  var hp = [BOX_HP, BOX_HP];
  list.forEach(function(r){ hp[0] -= r.take[0]; hp[1] -= r.take[1]; });
  return hp;
}
function penTally(list){
  var g = [0,0], t = [0,0];
  list.forEach(function(k){ t[k.shooter]++; if (k.goal) g[k.shooter]++; });
  return {g:g, t:t};
}
function roundWins(list){
  var w = [0,0];
  list.forEach(function(r){ if (r.w === 0 || r.w === 1) w[r.w]++; });
  return w;
}
function int(v, lo, hi){ v = Math.round(Number(v)); if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }

var RULES = {
  pen: {
    resolve: function(n, p0, p1){
      var sh = n % 2, shot = int(sh === 0 ? p0 : p1, 0, 2), dive = int(sh === 0 ? p1 : p0, 0, 2);
      return {p:[p0, p1], shooter: sh, shot: shot, dive: dive, goal: shot !== dive, w: shot !== dive ? sh : 1 - sh};
    },
    winner: function(list){
      var r = penTally(list), g = r.g, t = r.t, n = list.length;
      if (n <= 10){
        if (g[0] > g[1] + (5 - t[1])) return 0;
        if (g[1] > g[0] + (5 - t[0])) return 1;
        return null;
      }
      if (n % 2 === 0 && g[0] !== g[1]) return g[0] > g[1] ? 0 : 1;
      return null;
    },
    cpu: function(){ return rand(); },
    valid: function(n, seat, v){ return int(v, 0, 2); }
  },
  rps: {
    resolve: function(n, p0, p1){ var a = int(p0, 0, 2), b = int(p1, 0, 2); return {p:[a, b], a: a, b: b, w: rpsBeatsN(a, b)}; },
    winner: function(list){ var w = roundWins(list); return w[0] >= RPS_TO ? 0 : w[1] >= RPS_TO ? 1 : null; },
    cpu: function(){ return rand(); },
    valid: function(n, seat, v){ return int(v, 0, 2); }
  },
  tug: {
    resolve: function(n, p0, p1, list){
      var st = tugReplay(list), b0 = int(p0, 0, st.left[0]), b1 = int(p1, 0, st.left[1]);
      var move = b0 > b1 ? -1 : b1 > b0 ? 1 : 0;
      return {p:[b0, b1], b0: b0, b1: b1, move: move, w: move < 0 ? 0 : move > 0 ? 1 : null, from: st.pos, to: st.pos + move, left0: st.left.slice()};
    },
    winner: function(list){
      var st = tugReplay(list);
      if (st.pos <= -TUG_WIN) return 0;
      if (st.pos >= TUG_WIN) return 1;
      if (list.length >= 40) return st.pos < 0 ? 0 : st.pos > 0 ? 1 : (st.wins[0] >= st.wins[1] ? 0 : 1);
      return null;
    },
    cpu: function(n, list){
      var st = tugReplay(list), me = st.left[1], you = st.left[0];
      if (me <= 0) return 0;
      if (you <= 0) return Math.min(me, 1);
      var urgent = st.pos <= -2 ? 1.6 : st.pos >= 2 ? 1.3 : 1;
      var b = Math.round(me * (0.18 + Math.random() * 0.3) * urgent);
      if (Math.random() < 0.15) b = Math.min(me, you + 1);
      return int(b, 0, me);
    },
    valid: function(n, seat, v, list){ return int(v, 0, tugLeft(list)[seat]); }
  },
  box: {
    resolve: function(n, p0, p1, list){
      var pk = [int(p0, 0, 8), int(p1, 0, 8)], a = [Math.floor(pk[0] / 3), Math.floor(pk[1] / 3)], g = [pk[0] % 3, pk[1] % 3];
      var take = [0, 0], hit = [false, false], dmg = [0, 0];
      for (var i = 0; i < 2; i++){
        var j = 1 - i;
        if (g[j] === BOX_BLOCKER[a[i]]){ take[i] += BOX_COUNTER[a[i]]; dmg[i] = BOX_COUNTER[a[i]]; }
        else { take[j] += BOX_HIT[a[i]]; dmg[i] = BOX_HIT[a[i]]; hit[i] = true; }
      }
      var turn = {p: pk, a: a, g: g, take: take, hit: hit, dmg: dmg, w: take[1] > take[0] ? 0 : take[0] > take[1] ? 1 : null, ko: null};
      var after = list.concat([turn]), hp = boxHp(after), fin = RULES.box.winner(after);
      if (fin !== null && hp[1 - fin] <= 0) turn.ko = 1 - fin;
      return turn;
    },
    winner: function(list){
      var hp = boxHp(list), n = list.length;
      if (hp[0] <= 0 || hp[1] <= 0 || n >= BOX_TURNS){ if (hp[0] !== hp[1]) return hp[0] > hp[1] ? 0 : 1; }
      if (n >= 30) return 0;
      return null;
    },
    cpu: function(){ return rand() * 3 + rand(); },
    valid: function(n, seat, v){ return int(v, 0, 8); }
  },
  qd: {
    resolve: function(n, p0, p1){
      var ms = [p0, p1].map(function(v){ v = Math.round(Number(v)); return !isFinite(v) ? 9999 : v < 0 ? -1 : Math.min(v, 9999); });
      var e0 = ms[0] < 0, e1 = ms[1] < 0, w = null, why = 'speed';
      if (e0 && e1) why = 'early';
      else if (e0){ w = 1; why = 'early'; }
      else if (e1){ w = 0; why = 'early'; }
      else if (ms[0] >= 9999 && ms[1] >= 9999) w = null;
      else if (ms[0] < ms[1]) w = 0;
      else if (ms[1] < ms[0]) w = 1;
      return {p: ms, ms: ms, w: w, why: why};
    },
    winner: function(list){ var w = roundWins(list); return w[0] >= QD_TO ? 0 : w[1] >= QD_TO ? 1 : null; },
    cpu: function(){ return Math.random() < 0.06 ? -1 : Math.round(205 + Math.random() * 235); },
    valid: function(n, seat, v){ v = Math.round(Number(v)); return !isFinite(v) ? 9999 : v < 0 ? -1 : Math.min(v, 9999); }
  }
};
RULES.pensd = RULES.pen;
function winnerOf(game, list){ return RULES[game].winner(list); }
