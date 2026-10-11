/* Duelist · js/main.js
   Wiring: buttons, start-up. Loaded last. */

/* ---------- wiring ---------- */
Array.prototype.forEach.call(document.querySelectorAll('.game'), function(b){
  b.addEventListener('click', function(){ HUB.game = b.dataset.game; renderHub(); haptic('tap'); SFX.boing(); });
});
var _renderHub = renderHub;
renderHub = function(){ _renderHub(); renderResume(); };
$('changeName').onclick = function(){ editingNick = true; renderWho(); $('nickIn').focus(); };
$('nickSave').onclick = saveNick;
$('nickIn').addEventListener('keydown', function(e){ if (e.key === 'Enter') saveNick(); });
$('cpuBtn').onclick = function(){ if (!needNick()) start('cpu'); };
$('localBtn').onclick = function(){ start('local'); };
$('onlineBtn').onclick = function(){ if (needNick()) return; openLobby(''); };
$('findBtn').onclick = findMatch;
$('createBtn').onclick = createMatch;
$('joinBtn').onclick = function(){ joinMatch(); };
$('codeIn').addEventListener('keydown', function(e){ if (e.key === 'Enter') joinMatch(); });
$('queueCancel').onclick = function(){ stopQueue(); lobbyView('form'); };
$('lobbyBack').onclick = function(){ stopQueue(); netDetach(); showScreen('menu'); };
$('copyBtn').onclick = function(){
  var b = $('copyBtn'), code = $('codeShow').textContent;
  var done = function(){ b.textContent = 'COPIED!'; setTimeout(function(){ b.textContent = 'COPY CODE'; }, 1500); };
  try { navigator.clipboard.writeText(code).then(done, selectCode); } catch (e) { selectCode(); }
};
function selectCode(){ var r = document.createRange(); r.selectNodeContents($('codeShow')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
$('nextBtn').onclick = beginTurn;
$('nextGameBtn').onclick = function(){ if (S.mode === 'online') netNextGame(); else startSub(S.series.idx + 1); };
$('rematchBtn').onclick = function(){ if (S.mode === 'online') netRematch(); else { HUB.game = S.kind; start(S.mode); } };
$('quitBtn').onclick = toMenu;
$('helpBtn').onclick = function(e){ e.stopPropagation(); if (S) openTutorial(S.game); };
$('tutOk').onclick = closeTutorial;
$('muteBtn').onclick = function(e){
  e.stopPropagation();
  Snd.muted = !Snd.muted;
  try { localStorage.setItem('pd-mute', Snd.muted ? '1' : '0'); } catch (err) {}
  ambience(!Snd.muted);
  paintMute();
};
$('stage').addEventListener('pointerdown', function(e){
  if (e.target.closest('button')) return;
  if (S && S.qdLive && S.mode !== 'local'){ e.preventDefault(); qdTapAt = performance.now(); qdTap(S.mode === 'online' ? S.me : 0); return; }
});
var qdTapAt = -1e9;   // the tap that fires the gun must not also skip the BANG animation that follows it
$('stage').addEventListener('click', function(e){ if (e.target.closest('button')) return; if (performance.now() - qdTapAt < 800) return; if (!(S && S.qdLive)) skipAnim(); });
Array.prototype.forEach.call(document.querySelectorAll('#reacts button'), function(b){
  b.addEventListener('click', function(){ sendReact(b.dataset.r); });
});
$('chatSend').onclick = sendChat;
$('chatIn').addEventListener('keydown', function(e){ if (e.key === 'Enter') sendChat(); });
$('chatMute').onclick = function(){
  chatMuted = !chatMuted;
  $('chatMute').textContent = chatMuted ? 'UNMUTE' : 'MUTE';
  $('chatMute').setAttribute('aria-pressed', chatMuted ? 'true' : 'false');
  renderChat();
};
$('shareBtn').onclick = shareInvite;
if (!TG) $('shareBtn').hidden = true;
if (TG && TG.BackButton) TG.BackButton.onClick(function(){
  if (!$('game').hidden) toMenu(); else { stopQueue(); netDetach(); showScreen('menu'); }
});
// Until the account loads, use this device's name, or the Telegram first name on a new device.
if (TG && !nick()){
  var tgu = TG.initDataUnsafe && TG.initDataUnsafe.user;
  if (tgu && (tgu.first_name || tgu.username)) setLocalNick(String(tgu.first_name || tgu.username));
}
paintMute();
loadStats();   // vs-computer record + the player's account
renderHub();
// A link ending in #CODE opens straight into the join screen.
if (/^#[A-Za-z0-9]{4}$/.test(location.hash)){ var hc = location.hash.slice(1).toUpperCase(); if (nick()) openLobby(hc); }
// An invite link t.me/the_duelist_bot/play?startapp=CODE joins that match straight away.
var startCode = TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param;
if (startCode && /^[A-Za-z0-9]{4}$/.test(startCode) && nick()) openLobby(startCode.toUpperCase(), true);

// Test hook, only active with #debug in the address.
if (location.hash === '#debug'){
  window.__pd = {
    start: function(game, mode){ HUB.game = game; start(mode || 'cpu'); $('tut').hidden = true; },
    turn: function(game, p0, p1, t){
      if (!S || S.game !== game){ HUB.game = game; start('cpu'); }
      $('tut').hidden = true; setControls('none');
      var turn = RULES[game].resolve(S.kicks.length, p0, p1, S.kicks);
      A.plan = null; A.rps = null; A.tug = null; A.box = null; A.qd = null;
      if (game === 'pen') A.plan = makePlan(turn.shot, turn.dive);
      if (game === 'rps') A.rps = {a: turn.a, b: turn.b, w: turn.w};
      if (game === 'tug') A.tug = turn; if (game === 'box') A.box = turn; if (game === 'qd') A.qd = turn;
      A.playing = true; A.freeze = t; return turn;
    },
    push: function(game, p0, p1){ S.kicks.push(RULES[game].resolve(S.kicks.length, p0, p1, S.kicks)); renderBoard(false); },
    idle: function(){ A.playing = false; A.freeze = null; A.plan = null; A.rps = null; A.tug = null; A.box = null; A.qd = null; },
    live: function(phase){ S.qdLive = {phase: phase, start: performance.now(), steadyAt: 1e15, drawAt: 1e15, drawShown: performance.now() - 50, taps: [null, null]}; },
    state: function(){ return S; }
  };
}
