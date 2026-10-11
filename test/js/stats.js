/* Duelist · js/stats.js
   Player account (name + online record, kept on the server) and the separate
   vs-computer record. */

/* =====================================================================
   ACCOUNT
   Inside Telegram, every player has one account, tied to their Telegram user
   (not to the phone). The server keeps the name, the online record per game,
   streaks and the record against each opponent. The server counts online
   results itself, so they can't be faked. Outside Telegram (plain browser)
   you play as a guest: name on this device only, no online record.
   ===================================================================== */
var Acct = {profile: null, loading: null, failed: false};

function localNick(){ try { return (localStorage.getItem('pd-nick') || '').slice(0, 12); } catch (e) { return ''; } }
function nick(){
  if (Acct.profile && Acct.profile.name) return Acct.profile.name;
  return localNick();
}
function setLocalNick(v){ try { localStorage.setItem('pd-nick', String(v).trim().slice(0, 12)); } catch (e) {} }

// Load (or refresh) my account from the server. The first time, the server creates it,
// starting from the name this device already used.
function loadAccount(){
  if (!TG) return Promise.resolve(null);
  if (Acct.loading) return Acct.loading;
  Acct.loading = api('profile', {name: localNick()}).then(function(d){
    Acct.profile = d; Acct.failed = false;
    if (d && d.name) setLocalNick(d.name);
    if (!$('menu').hidden) renderHub();
    return d;
  }).catch(function(){ Acct.failed = true; return null; })
    .then(function(d){ Acct.loading = null; return d; });
  return Acct.loading;
}

var editingNick = false;
function renderWho(){
  var n = nick();
  $('meName').textContent = n || 'Player';
  $('meAvatar').textContent = (n || '?').charAt(0).toUpperCase();
  $('nickBox').hidden = !(editingNick || !n);
  if (!$('nickBox').hidden && document.activeElement !== $('nickIn')) $('nickIn').value = n;
}
function saveNick(){
  var v = $('nickIn').value.trim();
  if (!v){ $('nickIn').focus(); $('nickIn').placeholder = 'Type a name first'; return; }
  if (!TG){ setLocalNick(v); editingNick = false; renderWho(); haptic('success'); return; }
  // In Telegram the name belongs to the account, so the server saves it.
  $('nickSave').disabled = true;
  api('set_name', {name: v}).then(function(d){
    if (Acct.profile) Acct.profile.name = d.name; else Acct.profile = {name: d.name, stats: {}, h2h: []};
    setLocalNick(d.name); editingNick = false; renderWho(); haptic('success');
  }).catch(function(e){
    $('nickIn').value = ''; $('nickIn').placeholder = e.message.slice(0, 40); haptic('error');
  }).then(function(){ $('nickSave').disabled = false; });
}
function needNick(){
  if (nick()) return false;
  editingNick = true; renderWho(); $('nickIn').focus(); $('nickIn').placeholder = 'Pick a name first';
  return true;
}

/* =====================================================================
   VS COMPUTER RECORD
   Kept apart from the online record (the server can't check games vs the
   computer). Saved in the player's own Telegram storage, so it follows the
   Telegram account across devices; outside Telegram, on this device only.
   Easy to remove later: delete this section and its use in renderStats().
   ===================================================================== */
var CpuRec = {data: null};
var CPU_KEY = 'pd-cpu';
function zrec(){ return {w: 0, l: 0, cur: 0, best: 0}; }
function emptyCpu(){ return {all: zrec(), pen: zrec(), rps: zrec(), tug: zrec(), box: zrec(), qd: zrec(), mix: zrec(), seen: []}; }
function fixCpu(d){
  var e = emptyCpu();
  if (!d || !d.all) return e;
  Object.keys(e).forEach(function(k){ if (d[k] === undefined) d[k] = e[k]; });
  return d;
}
function cloudOk(){ return tgOk('6.9') && TG.CloudStorage; }
function saveCpu(){
  var d = CpuRec.data;
  try { localStorage.setItem(CPU_KEY, JSON.stringify(d)); } catch (e) {}
  if (!cloudOk()) return;
  try { if (d.seen.length > 30) d.seen = d.seen.slice(-30); TG.CloudStorage.setItem(CPU_KEY, JSON.stringify(d)); } catch (e) {}
}
function loadStats(){
  var d = null;
  try { d = JSON.parse(localStorage.getItem(CPU_KEY) || 'null'); } catch (e) {}
  CpuRec.data = fixCpu(d);
  if (cloudOk()){
    try {
      TG.CloudStorage.getItem(CPU_KEY, function(err, v){
        var x = null; try { x = v ? JSON.parse(v) : null; } catch (e) {}
        if (x && x.all){
          CpuRec.data = fixCpu(x);
          try { localStorage.setItem(CPU_KEY, JSON.stringify(CpuRec.data)); } catch (e) {}
          if (!$('menu').hidden) renderStats();
        }
      });
    } catch (e) {}
  }
  loadAccount();
}
function bumpRec(rec, won){ if (won){ rec.w++; rec.cur++; rec.best = Math.max(rec.best, rec.cur); } else { rec.l++; rec.cur = 0; } }

/* =====================================================================
   A FINISHED MATCH
   vs computer: counted here, once.  online: the server already counted it;
   we reload the account and add "You vs Sam: 3–2 overall" to the result.
   One phone (pass-and-play): not counted.  Returns text for the result screen.
   ===================================================================== */
function h2hEntry(oppKey){
  var list = (Acct.profile && Acct.profile.h2h) || [];
  for (var i = 0; i < list.length; i++) if (list[i].key === oppKey) return list[i];
  return null;
}
function recordResult(kind, w){
  if (!S) return '';
  if (S.mode === 'cpu'){
    var d = CpuRec.data || (CpuRec.data = emptyCpu());
    if (d.seen.indexOf(S.matchId) < 0){
      d.seen.push(S.matchId); if (d.seen.length > 30) d.seen = d.seen.slice(-30);
      var won = isMe(w);
      bumpRec(d[kind] || (d[kind] = zrec()), won); bumpRec(d.all, won);
      saveCpu();
    }
    return '';
  }
  if (S.mode === 'online' && TG){
    var mine = S, opp = S.oppUid, oppName = pname(1 - S.me);
    setTimeout(function(){
      loadAccount().then(function(){
        var h = h2hEntry(opp);
        if (!h || S !== mine || $('flash').hidden) return;
        $('flashSmall').textContent += ' You vs ' + oppName + ': ' + h.w + '–' + h.l + ' overall.';
      });
    }, 1200);
  }
  return '';
}

/* =====================================================================
   MENU PANEL
   ===================================================================== */
function pct(r){ var n = r.w + r.l; return n ? Math.round(r.w / n * 100) + '%' : '–'; }
function statTiles(a){
  var tiles = document.createElement('div'); tiles.className = 'tiles';
  [[a.w + a.l, 'Played'], [pct(a), 'Win rate'], [a.cur, 'Streak'], [a.best, 'Best']].forEach(function(t){
    var x = document.createElement('div'); x.className = 'tile';
    var b = document.createElement('b'); b.textContent = t[0];
    var s = document.createElement('span'); s.textContent = t[1];
    x.appendChild(b); x.appendChild(s); tiles.appendChild(x);
  });
  return tiles;
}
function gameRows(el, d){
  ['pen', 'rps', 'tug', 'box', 'qd', 'mix'].forEach(function(g){
    var r = d[g]; if (!r || r.w + r.l === 0) return;
    var row = document.createElement('div'); row.className = 'srow';
    [GAME_NAME[g], r.w + '–' + r.l + ' · ' + pct(r), 'Streak ' + r.cur].forEach(function(txt){ var s = document.createElement('span'); s.textContent = txt; row.appendChild(s); });
    el.appendChild(row);
  });
}
function heading(el, text, top){
  var h = document.createElement('h3'); h.textContent = text; if (top) h.style.marginTop = '4px'; el.appendChild(h);
}
function note(el, text){ var p = document.createElement('p'); p.textContent = text; el.appendChild(p); }

function renderStats(){
  var el = $('stats'), P = Acct.profile, online = (P && P.stats && P.stats.all) || zrec();
  var cpu = (CpuRec.data || emptyCpu()).all;
  var chip = TG ? online : cpu;
  $('chipRate').textContent = pct(chip); $('chipStreak').textContent = chip.cur;
  el.innerHTML = '';

  // Online record (Telegram only)
  heading(el, 'ONLINE RECORD');
  if (!TG){
    note(el, 'Your online record lives in your account. Open Duelist in Telegram to play online and build it.');
  } else if (!P){
    note(el, Acct.failed ? 'Couldn’t load your account. Check your connection; it will try again when you come back to the menu.' : 'Loading your account…');
  } else if (online.w + online.l === 0){
    note(el, 'Win rate, streaks and your record against each opponent show up here after your first online game.');
  } else {
    el.appendChild(statTiles(online));
    gameRows(el, P.stats);
    var friends = P.h2h || [];
    if (friends.length){
      heading(el, 'VS FRIENDS', true);
      friends.slice(0, 6).forEach(function(f){
        var row = document.createElement('div'); row.className = 'srow';
        var best = Object.keys(f.g || {}).map(function(k){ var r = f.g[k]; return GAME_NAME[k] + ' ' + r.w + '–' + r.l; }).join(', ');
        [f.name || 'Player', 'You ' + f.w + '–' + f.l, best].forEach(function(txt, i){
          var s = document.createElement('span'); s.textContent = txt;
          if (i === 2){ s.style.fontSize = '12px'; s.style.gridColumn = '1 / -1'; }
          row.appendChild(s);
        });
        el.appendChild(row);
      });
    }
  }

  // Vs computer: one short line, kept separate
  if (cpu.w + cpu.l > 0){
    heading(el, 'VS COMPUTER', true);
    var row = document.createElement('div'); row.className = 'srow';
    [cpu.w + '–' + cpu.l + ' · ' + pct(cpu), 'Streak ' + cpu.cur, 'Best ' + cpu.best].forEach(function(txt){ var s = document.createElement('span'); s.textContent = txt; row.appendChild(s); });
    el.appendChild(row);
  }
}

function renderHub(){
  Array.prototype.forEach.call(document.querySelectorAll('.game'), function(b){
    b.setAttribute('aria-checked', b.dataset.game === HUB.game ? 'true' : 'false');
  });
  renderWho(); renderStats();
}
