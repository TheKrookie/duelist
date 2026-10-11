/* Duelist · js/online-telegram.js
   ONLINE PLAY (Telegram + Supabase server). */

/* =====================================================================
   ONLINE PLAY  (Telegram build: Supabase server "duel", server v1.2)
   The page talks to our own small server:
     - every request carries Telegram's signed login, checked on the server
     - each turn both players send one secret number; the server keeps it
       private and publishes both (table "turns") once both have picked
     - both phones then rebuild the match with the same RULES as offline play
   Public tables the page reads, with live updates:
     matches  code, names, kind, game counter, series_start, order_list (Mixed Duel),
              forfeit, react0/react1, host_key/guest_key (anonymous player ids)
     locks    who locked in turn n · ready  Quick Draw "ready" · turns  both picks
     chat     messages
   Matchmaking ("Find an opponent") goes through the server's private queue.
   Presence (is the other player still here?) uses a live Supabase channel;
   30 s away counts as a forfeit. Online play only works inside Telegram.
   ===================================================================== */
var SB_URL = 'https://nlkbnoinoowpobvjmfgn.supabase.co';
var SB_KEY = 'sb_publishable_WZ8HtvzQuuylVeM9vwFngQ_2Rnz0U6O';
var FN_URL = SB_URL + '/functions/v1/duel';
// The test build (site/test/) invites friends into the test Mini App, so both play the same version.
var BOT_APP = 'https://t.me/the_duelist_bot/' + (/\/test\//.test(location.pathname) ? 'test' : 'play');
var Net = {init: null, sb: null, ch: null, code: null, seat: null, match: null,
           turns: {}, locks: {}, ready: {}, chat: [], reactSeen: [0, 0], chatSeen: 0, poll: null, gen: 0};
var NET_MSG = {
  none: 'Online play works in Telegram. Open the game at t.me/the_duelist_bot/play.',
  offline: 'Couldn’t reach the game server. Check your connection and try again.'
};

function netReady(){
  if (Net.init) return Net.init;
  Net.init = Promise.resolve().then(function(){
    if (!TG) return 'none';
    if (!window.supabase || !window.supabase.createClient) return 'offline';
    Net.sb = window.supabase.createClient(SB_URL, SB_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
    return 'ok';
  }).catch(function(){ return 'offline'; });
  return Net.init;
}

// One call to our server. Resolves with its answer, or fails with a readable message.
function api(action, body){
  var payload = Object.assign({action: action, initData: TG ? TG.initData : ''}, body || {});
  return fetch(FN_URL, {method: 'POST', headers: {'Content-Type': 'application/json', 'apikey': SB_KEY}, body: JSON.stringify(payload)})
    .then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(d){
        if (!r.ok || d.error){ var e = new Error(d.message || NET_MSG.offline); e.code = d.error || 'http'; throw e; }
        return d;
      });
    }, function(){ var e = new Error(NET_MSG.offline); e.code = 'offline'; throw e; });
}

function remember(code, seat){ try { localStorage.setItem('pd-match', JSON.stringify({code: code, seat: seat})); } catch (e) {} }
function recall(){ try { return JSON.parse(localStorage.getItem('pd-match') || 'null'); } catch (e) { return null; } }
function forget(){ try { localStorage.removeItem('pd-match'); } catch (e) {} }
function keyG(g, n){ return g + '_' + n; }
function key(n){ return keyG(S ? S.gnum : (Net.match && Net.match.game || 0), n); }
function inviteLink(code){ return BOT_APP + '?startapp=' + code; }

/* ---------- lobby ---------- */
function lobbyErr(msg){ $('lobbyErr').textContent = msg || ''; }
function setLobbyBusy(b){ ['findBtn', 'createBtn', 'joinBtn'].forEach(function(id){ $(id).disabled = b; }); }
function lobbyView(v){ $('lobbyForm').hidden = v !== 'form'; $('waitBox').hidden = v !== 'wait'; $('queueBox').hidden = v !== 'queue'; }

function openLobby(prefill, autoJoin){
  if (needNick()){ showScreen('menu'); return; }
  showScreen('lobby');
  $('lobbyGame').textContent = GAME_NAME[HUB.game].toUpperCase();
  lobbyView('form'); lobbyErr('');
  if (prefill) $('codeIn').value = prefill;
  setLobbyBusy(true);
  netReady().then(function(st){
    setLobbyBusy(st !== 'ok');
    if (st !== 'ok'){ lobbyErr(NET_MSG[st]); return; }
    if (autoJoin && prefill) joinMatch(prefill);
  });
}

function createMatch(){
  lobbyErr(''); setLobbyBusy(true);
  netReady().then(function(st){
    if (st !== 'ok'){ lobbyErr(NET_MSG[st]); setLobbyBusy(false); return; }
    return api('create', {kind: HUB.game, name: nick()}).then(function(d){
      remember(d.code, d.seat);
      netAttach(d.code, d.seat);
    });
  }).catch(function(e){ lobbyErr(e.message); setLobbyBusy(false); });
}

function joinMatch(code){
  lobbyErr('');
  code = (code || $('codeIn').value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)){ lobbyErr('Enter the 4-character code your friend sent you.'); return; }
  setLobbyBusy(true);
  var mem = recall(), hint = mem && mem.code === code ? mem.seat : undefined;
  netReady().then(function(st){
    if (st !== 'ok'){ lobbyErr(NET_MSG[st]); setLobbyBusy(false); return; }
    return api('join', {code: code, name: nick(), seat: hint}).then(function(d){
      remember(d.code, d.seat);
      netAttach(d.code, d.seat);
    });
  }).catch(function(e){ lobbyErr(e.message); setLobbyBusy(false); });
}

/* ---------- matchmaking: find a random opponent ---------- */
var MM = {ticket: null, t0: 0, tick: null, poll: null, busy: false, going: false};
function queueCountText(c){ c = Math.max(1, c || 1); $('queueCount').textContent = c + (c === 1 ? ' player in queue' : ' players in queue'); }
function findMatch(){
  lobbyErr(''); setLobbyBusy(true);
  netReady().then(function(st){
    setLobbyBusy(false);
    if (st !== 'ok'){ lobbyErr(NET_MSG[st]); return; }
    stopQueue();
    var my = MM = {ticket: null, t0: Date.now(), tick: null, poll: null, busy: false, going: false, kind: HUB.game};
    lobbyView('queue');
    $('queueTitle').textContent = 'FINDING AN OPPONENT…';
    queueCountText(1);
    my.tick = setInterval(function(){
      var s = Math.floor((Date.now() - my.t0) / 1000);
      $('queueTime').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
      if (s >= 120 && !my.going){ stopQueue(); lobbyView('form'); lobbyErr('Nobody else is looking for a ' + GAME_NAME[my.kind] + ' match right now. Try again, or challenge a friend.'); }
    }, 500);
    api('queue_join', {kind: my.kind, name: nick()}).then(function(d){
      if (MM !== my) { if (d.ticket) api('queue_leave', {ticket: d.ticket}).catch(function(){}); return; }
      if (d.state === 'matched'){ goMatched(d.code, d.seat); return; }
      my.ticket = d.ticket; queueCountText(d.count);
      my.poll = setInterval(function(){
        if (MM !== my || my.going || my.busy) return;
        my.busy = true;
        api('queue_poll', {ticket: my.ticket}).then(function(r){
          my.busy = false;
          if (MM !== my || my.going) return;
          if (r.state === 'matched') goMatched(r.code, r.seat);
          else if (r.state === 'gone'){ stopQueue(); lobbyView('form'); lobbyErr('You dropped out of the queue. Try again.'); }
          else queueCountText(r.count);
        }).catch(function(){ my.busy = false; });
      }, 1500);
    }).catch(function(e){ if (MM !== my) return; stopQueue(); lobbyView('form'); lobbyErr(e.message); });
  });
}
function goMatched(code, seat){
  if (MM.going) return;
  MM.going = true;
  $('queueTitle').textContent = 'OPPONENT FOUND!';
  SFX.win(); haptic('success');
  $('queueCancel').disabled = true;   // the match already exists on the server: no cancelling now
  var wait = Math.max(900, 2500 - (Date.now() - MM.t0));   // the queue screen always shows for at least 2.5 s
  setTimeout(function(){ stopQueue(); remember(code, seat); netAttach(code, seat); }, wait);
}
function stopQueue(){
  if (MM.tick) clearInterval(MM.tick);
  if (MM.poll) clearInterval(MM.poll);
  if (MM.ticket && !MM.going) api('queue_leave', {ticket: MM.ticket}).catch(function(){});
  MM = {ticket: null, t0: 0, tick: null, poll: null, busy: false, going: false};
  $('queueCancel').disabled = false;
}

/* ---------- attach to a match ---------- */
function netDetach(){
  Net.gen++;
  if (Net.ch && Net.sb){ try { Net.sb.removeChannel(Net.ch); } catch (e) {} }
  Net.ch = null;
  if (Net.poll){ clearInterval(Net.poll); Net.poll = null; }
  Net.code = null; Net.match = null; Net.turns = {}; Net.locks = {}; Net.ready = {}; Net.chat = [];
  presenceLeave();
  $('notice').hidden = true;
}

function addTurn(t){ if (t && typeof t.game === 'number') (Net.turns[t.game] = Net.turns[t.game] || [])[t.n] = t; }
function addFlag(store, r){
  if (!r || typeof r.game !== 'number') return;
  var k = keyG(r.game, r.n);
  (store[k] = store[k] || [false, false])[r.seat] = true;
}
function addChat(c){
  if (!c || typeof c.m !== 'string') return;
  if (Net.chat.some(function(x){ return x.id === c.id; })) return;
  Net.chat.push(c);
  Net.chat.sort(function(a, b){ return a.id - b.id; });
  if (Net.chat.length > 60) Net.chat = Net.chat.slice(-60);
}

// Load the whole match fresh (on join, after reconnecting, and as a safety net every few seconds).
function refetch(){
  var code = Net.code, gen = Net.gen, sb = Net.sb;
  if (!code || !sb) return Promise.resolve();
  return Promise.all([
    sb.from('matches').select('*').eq('code', code).maybeSingle(),
    sb.from('turns').select('game, n, p0, p1').eq('code', code),
    sb.from('locks').select('game, n, seat').eq('code', code),
    sb.from('ready').select('game, n, seat').eq('code', code),
    sb.from('chat').select('id, seat, t, m').eq('code', code).order('id', {ascending: false}).limit(40)
  ]).then(function(r){
    if (gen !== Net.gen) return;
    if (r.some(function(x){ return x.error; })) throw new Error('read');
    Net.match = r[0].data;
    Net.turns = {}; (r[1].data || []).forEach(addTurn);
    Net.locks = {}; (r[2].data || []).forEach(function(x){ addFlag(Net.locks, x); });
    Net.ready = {}; (r[3].data || []).forEach(function(x){ addFlag(Net.ready, x); });
    (r[4].data || []).forEach(addChat);
    onNet(); renderChat();
  }).catch(function(){ if (gen === Net.gen) netErr(); });
}

function netAttach(code, seat){
  netDetach();
  var gen = Net.gen;
  Net.code = code; Net.seat = seat; Net.reactSeen = [Date.now(), Date.now()]; Net.chatSeen = Date.now();
  var f = 'code=eq.' + code, mine = function(fn){ return function(p){ if (gen === Net.gen){ fn(p); onNet(); } }; };
  Net.ch = Net.sb.channel('match-' + code + '-' + gen)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'matches', filter: f}, mine(function(p){ if (p.new && p.new.code) Net.match = p.new; }))
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'turns', filter: f}, mine(function(p){ addTurn(p.new); }))
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'locks', filter: f}, mine(function(p){ addFlag(Net.locks, p.new); }))
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'ready', filter: f}, mine(function(p){ addFlag(Net.ready, p.new); }))
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'chat', filter: f}, mine(function(p){ addChat(p.new); renderChat(); }))
    .subscribe(function(status){ if (gen === Net.gen && status === 'SUBSCRIBED') refetch(); });
  // Safety net: if a live update is ever missed (phone asleep, weak signal), catch up every few seconds.
  Net.poll = setInterval(function(){ if (gen === Net.gen && document.visibilityState !== 'hidden') refetch(); }, 5000);
  refetch();
  $('codeShow').textContent = code;
  $('lobbyGame').textContent = GAME_NAME[HUB.game].toUpperCase();
  lobbyView('wait');
  setLobbyBusy(false);
  presenceJoin(code, seat);
}

function netErr(){
  var msg = 'Connection problem. Trying again… If it doesn’t come back, go to the menu and use Resume to rejoin match ' + (Net.code || '') + '.';
  if (S && S.mode === 'online'){ if (S.phase === 'wait' || S.phase === 'sending') $('waitSub').textContent = msg; }
  else lobbyErr(msg);
}

function netNames(){ var m = Net.match || {}; return [m.host_name || 'Blue', m.guest_name || 'Orange']; }
function typeOf(g){
  var m = Net.match || {}, kind = m.kind || 'pen';
  if (kind !== 'mix') return kind;
  var order = m.order_list || ['pen', 'rps', 'tug'];
  return order[Math.max(0, Math.min(2, g - (m.series_start || 0)))];
}
// Every turn both players picked in game g, rebuilt with the same rules as offline play.
function resolvedFor(g){
  var out = [], list = Net.turns[g] || [], type = typeOf(g), R = RULES[type];
  for (var n = 0; n < list.length && list[n]; n++){
    var pa = R.valid(n, 0, list[n].p0, out), pb = R.valid(n, 1, list[n].p1, out);
    out.push(R.resolve(n, pa, pb, out));
  }
  return out;
}

function buildOnline(){
  var m = Net.match, g = m.game || 0, kind = m.kind || 'pen';
  HUB.game = kind;
  S = {mode: 'online', code: Net.code, me: Net.seat, gnum: g, kind: kind, seriesStart: m.series_start || 0,
       names: netNames(), kicks: [], phase: null, oppUid: Net.seat === 0 ? m.guest_key : m.host_key,
       orderKey: JSON.stringify(m.order_list || null)};
  if (kind === 'mix'){ S.series = {order: (m.order_list || ['pen', 'rps', 'tug']).slice(), idx: g - S.seriesStart, results: []}; refreshSeries(); }
  S.game = typeOf(g);
  S.kicks = resolvedFor(g);
  showScreen('game');
  ambience(true);
  renderChat();
  beginTurn();
}
function refreshSeries(){
  if (!S.series) return;
  for (var i = S.seriesStart; i < S.gnum; i++) S.series.results[i - S.seriesStart] = winnerOf(typeOf(i), resolvedFor(i));
}

function onNet(){
  var m = Net.match;
  if (!m || !Net.code) return;
  if (!m.has_guest && !(S && S.mode === 'online')){
    if ($('lobby').hidden) showScreen('lobby');
    lobbyView('wait');
    return;
  }
  if (!S || S.mode !== 'online' || S.code !== Net.code || (m.game || 0) !== S.gnum || JSON.stringify(m.order_list || null) !== S.orderKey){ buildOnline(); return; }
  var nm = netNames();
  if (nm[0] !== S.names[0] || nm[1] !== S.names[1]){ S.names = nm; renderBoard(S.phase === 'over'); }
  if (!S.oppUid) S.oppUid = S.me === 0 ? m.guest_key : m.host_key;
  if (S.series) refreshSeries();
  if (m.forfeit && m.forfeit.g === S.gnum && S.phase !== 'over' && !S.forfeited){
    S.forfeited = true; stopTimer(); A.playing = false;
    S.phase = 'forfeit-pending';
    finishGame(1 - m.forfeit.seat, null, true);
    return;
  }
  var opp = 1 - S.me, rv = m['react' + opp];
  if (rv && rv.n > Net.reactSeen[opp]){
    Net.reactSeen[opp] = rv.n;
    if (typeof rv.k === 'string') showBubble(opp, rv.k.slice(0, 12));
  }
  if (S.phase === 'pick' || S.phase === 'wait' || S.phase === null) netStep();
}

function qdDelay(k){ var s = Net.code + ':' + k, h = 0; for (var i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return 1400 + Math.abs(h) % 2600; }

function netStep(){
  if (!S || ['reveal', 'result', 'over', 'subover', 'sending', 'qd', 'forfeit-pending'].indexOf(S.phase) >= 0) return;
  var n = S.kicks.length, res = resolvedFor(S.gnum);
  if (res.length > n){ reveal(res[n]); return; }
  var k = key(n), lk = Net.locks[k] || [false, false], rd = Net.ready[k] || [false, false];
  var oppName = S.names[1 - S.me];
  if (lk[S.me]){
    S.phase = 'wait';
    showWait('LOCKED IN', lk[1 - S.me] ? 'Both picks are in. Revealing…' : 'Waiting for ' + oppName + ' to pick…');
    return;
  }
  if (S.game === 'qd'){
    if (rd[S.me] && rd[1 - S.me]){ startQd(qdDelay(k)); return; }
    if (rd[S.me]){ S.phase = 'wait'; showWait('READY!', 'Waiting for ' + oppName + ' to get ready…'); return; }
  }
  if (S.phase !== 'pick') setPhase(S.me);
}

function netReady2(){
  var n = S.kicks.length, g = S.gnum;
  S.phase = 'sending';
  showWait('READY!', 'Waiting for ' + S.names[1 - S.me] + ' to get ready…');
  api('ready', {code: Net.code, seat: S.me, game: g, n: n}).then(function(){
    addFlag(Net.ready, {game: g, n: n, seat: S.me});
    if (S && S.mode === 'online'){ S.phase = 'wait'; onNet(); }
  }).catch(function(){
    if (!S || S.mode !== 'online') return;
    S.phase = null; setPhase(S.me); $('roleSub').textContent = 'That didn’t send. Check your connection and tap again.';
  });
}

function netCommit(v, auto){
  var n = S.kicks.length, g = S.gnum, wasQd = S.game === 'qd';
  S.phase = 'sending';
  showWait('LOCKED IN', auto ? 'Time’s up. A pick was sent for you…' : 'Sending…');
  api('pick', {code: Net.code, seat: S.me, game: g, n: n, pick: Math.round(Number(v))}).then(function(){
    addFlag(Net.locks, {game: g, n: n, seat: S.me});
    if (S && S.mode === 'online'){ S.phase = 'wait'; onNet(); }
  }).catch(function(e){
    if (!S || S.mode !== 'online') return;
    if (e.code === 'stale'){ S.phase = 'wait'; refetch(); return; }
    S.phase = null;
    if (wasQd){ showWait('CONNECTION PROBLEM', 'Your draw didn’t send. Go back to the menu and use Resume.'); return; }
    setPhase(S.me);
    $('roleSub').textContent = e.code === 'offline' ? 'Your pick didn’t send. Check your connection and pick again.' : e.message;
  });
}

function netAdvance(rematch){
  $('rematchBtn').disabled = true; $('nextGameBtn').disabled = true;
  api('advance', {code: Net.code, seat: S.me, game: S.gnum, rematch: !!rematch})
    .then(refetch)
    .catch(function(e){ if (!S || S.mode !== 'online') return; showWait('HMM', e.message); $(S.phase === 'subover' ? 'nextGameBtn' : 'rematchBtn').hidden = false; })
    .then(function(){ $('rematchBtn').disabled = false; $('nextGameBtn').disabled = false; });
}
function netNextGame(){ netAdvance(false); }
function netRematch(){ netAdvance(true); }
function netForfeit(){
  if (!Net.code || !S) return;
  api('forfeit', {code: Net.code, seat: S.me, game: S.gnum, loser: S.me}).catch(function(){});
  if (S.mode === 'online') recordResult(S.series ? 'mix' : S.game, 1 - S.me);
}

/* ---------- presence: is the other player still here? ---------- */
var Pres = {ch: null, oppHere: true, awaySince: 0, tick: null, ready: false, claimed: false};
function presenceJoin(code, seat){
  presenceLeave();
  if (!Net.sb) return;
  try {
    var ch = Net.sb.channel('room-' + code, {config: {presence: {key: 's' + seat + '-' + Math.random().toString(36).slice(2, 8)}}});
    ch.on('presence', {event: 'sync'}, function(){
      var st = ch.presenceState(), peers = [];
      Object.keys(st).forEach(function(k){ (st[k] || []).forEach(function(p){ peers.push(p); }); });
      updatePresence(peers);
    }).subscribe(function(status){ if (status === 'SUBSCRIBED') ch.track({seat: seat}); });
    Pres.ch = ch;
    setTimeout(function(){ Pres.ready = true; }, 8000);
    Pres.tick = setInterval(checkAway, 1000);
  } catch (e) {}
}
function presenceLeave(){
  if (Pres.tick) clearInterval(Pres.tick);
  if (Pres.ch && Net.sb){ try { Net.sb.removeChannel(Pres.ch); } catch (e) {} }
  Pres = {ch: null, oppHere: true, awaySince: 0, tick: null, ready: false, claimed: false};
}
function updatePresence(peers){
  var opp = 1 - Net.seat;
  Pres.oppHere = peers.some(function(p){ return p && p.seat === opp; });
  if (Pres.oppHere){ Pres.awaySince = 0; Pres.claimed = false; } else if (!Pres.awaySince) Pres.awaySince = Date.now();
}
function checkAway(){
  var n = $('notice');
  if (!S || S.mode !== 'online' || !Pres.ready || !onlineLive() || !Net.match || !Net.match.has_guest || Pres.oppHere || !Pres.awaySince){ n.hidden = true; return; }
  var left = 30 - Math.floor((Date.now() - Pres.awaySince) / 1000), who = S.names[1 - S.me];
  n.hidden = false;
  if (left > 0) n.textContent = who + ' lost connection. If they’re not back in ' + left + ' s, you win.';
  else {
    n.textContent = who + ' didn’t come back. You win by forfeit.';
    if (!Pres.claimed){
      Pres.claimed = true;
      api('forfeit', {code: Net.code, seat: S.me, game: S.gnum, loser: 1 - S.me}).catch(function(){ Pres.claimed = false; });
    }
  }
}

/* ---------- quick reactions + chat ---------- */
var lastReact = 0, lastChat = 0, chatMuted = false;
var BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigg', 'fagg', 'whore', 'slut', 'asshole', 'bastard', 'retard',
           'хуй', 'пизд', 'ебат', 'ебан', 'бля', 'сука', 'мудак', 'пидор', 'гандон', 'шлюх', 'долбо'];
function cleanText(s){
  s = String(s || '').replace(new RegExp('[\\u0000-\\u001f\\u200b-\\u200f\\u2028-\\u202e]', 'g'), ' ').trim().slice(0, 120);
  s = s.replace(/(https?:\/\/|www\.)\S+|t\.me\/\S+|@[a-z0-9_]{4,}/gi, '[link removed]');
  BAD.forEach(function(w){
    var re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    s = s.replace(re, function(m){ return m.charAt(0) + new Array(m.length).join('*'); });
  });
  return s;
}
function showBubble(p, text){
  var el = document.createElement('div');
  el.className = 'bubble ' + (p === 0 ? 'l' : 'r');
  el.style.background = p === 0 ? '#9fd0ff' : '#ffc48c';
  el.textContent = (isMe(p) ? 'You' : pname(p)) + ': ' + text;
  $('stage').appendChild(el);
  SFX.pop(); haptic('light');
  setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 2900);
}
function sendReact(text){
  var now = Date.now();
  if (!S || S.mode !== 'online' || now - lastReact < 1500) return;
  lastReact = now;
  api('react', {code: Net.code, seat: S.me, text: text}).catch(function(){});
  showBubble(S.me, text);
}
function sendChat(){
  var inp = $('chatIn'), text = cleanText(inp.value), now = Date.now();
  if (!text || !S || S.mode !== 'online') return;
  if (now - lastChat < 1000) return;
  lastChat = now; inp.value = '';
  SFX.send();
  api('chat', {code: Net.code, seat: S.me, text: text}).then(refetch).catch(function(e){
    var log = $('chatLog'), d = document.createElement('div'); d.className = 'msg'; d.textContent = e.message; log.appendChild(d); log.hidden = false;
  });
}
function renderChat(){
  var log = $('chatLog');
  if (!S || S.mode !== 'online'){ log.innerHTML = ''; return; }
  var msgs = Net.chat.map(function(c){ return {p: c.seat, t: Number(c.t) || 0, m: cleanText(c.m)}; });
  var opp = 1 - S.me, fresh = msgs.filter(function(c){ return c.p === opp && c.t > Net.chatSeen; });
  if (fresh.length){ Net.chatSeen = fresh[fresh.length - 1].t; if (!chatMuted){ SFX.pop(); haptic('light'); } }
  log.innerHTML = '';
  var shown = msgs.filter(function(c){ return !(chatMuted && c.p === opp); }).slice(-30);
  if (chatMuted){ var mm = document.createElement('div'); mm.className = 'msg'; mm.textContent = 'You muted ' + S.names[opp] + '’s messages.'; log.appendChild(mm); }
  shown.forEach(function(c){
    var d = document.createElement('div'); d.className = 'msg' + (c.p === S.me ? ' me' : '');
    var b = document.createElement('b'); b.textContent = (c.p === S.me ? 'You' : S.names[c.p]) + ':';
    d.appendChild(b); d.appendChild(document.createTextNode(c.m));
    log.appendChild(d);
  });
  log.hidden = !shown.length && !chatMuted;
  log.scrollTop = log.scrollHeight;
}

/* ---------- resume a match after a reload ---------- */
function renderResume(){
  var m = recall(), box = document.getElementById('resumeBox');
  if (!m){ if (box) box.remove(); return; }
  if (!box){
    box = document.createElement('div'); box.id = 'resumeBox'; box.className = 'panel';
    var p = document.createElement('p'); p.id = 'resumeText';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn y'; b.textContent = 'RESUME MATCH';
    b.addEventListener('click', function(){
      var mm = recall(); if (!mm) return;
      netReady().then(function(st){ if (st !== 'ok'){ showScreen('lobby'); lobbyErr(NET_MSG[st]); return; } showScreen('lobby'); netAttach(mm.code, mm.seat); });
    });
    var x = document.createElement('button'); x.type = 'button'; x.className = 'link'; x.style.color = 'var(--muted-ink)'; x.textContent = 'Forget it';
    x.addEventListener('click', function(){ forget(); renderResume(); });
    box.appendChild(p); box.appendChild(b); box.appendChild(x);
    $('menu').insertBefore(box, $('games'));
  }
  $('resumeText').textContent = 'You were in online match ' + m.code + '. Jump back in?';
}

/* ---------- Telegram invite ---------- */
function shareInvite(){
  var code = $('codeShow').textContent, link = inviteLink(code);
  var text = 'Duel me in ' + GAME_NAME[HUB.game] + '! Match code ' + code;
  if (TG && TG.openTelegramLink) TG.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
  else { try { navigator.clipboard.writeText(link); } catch (e) {} }
}
