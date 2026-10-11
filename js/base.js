/* Duelist · js/base.js
   Shared helpers and Telegram setup. Loaded first. */

var $ = function(id){ return document.getElementById(id); };
var KITC = ['#3d9bff', '#ff8a2a'];
var SHOT_TXT = ['Shot left', 'Shot down the middle', 'Shot right'];
var DIVE_TXT = ['keeper dived left', 'keeper stayed in the middle', 'keeper dived right'];
var ICON_BALL = '<circle cx="17" cy="17" r="14" fill="#f4f6f2" stroke="#08110c" stroke-width="2"/><polygon points="17,11 22.5,15 20.5,21.5 13.5,21.5 11.5,15" fill="#08110c"/>';
var ICON_GLOVE = '<rect x="9" y="12" width="16" height="17" rx="5" fill="#f4f6f2" stroke="#08110c" stroke-width="2"/><path d="M11 13V6M15 12V4M19 12V4M23 13V7" stroke="#08110c" stroke-width="3" stroke-linecap="round"/>';
var CHECK = '<svg viewBox="0 0 12 12"><path d="M2.5 6.3l2.3 2.3 4.7-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var CROSS = '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var S = null;

// Telegram Mini App: header colour, back button, the player's Telegram name.
var TG = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) ? window.Telegram.WebApp : null;
function tgOk(v){ try { return !!(TG && TG.isVersionAtLeast && TG.isVersionAtLeast(v)); } catch (e) { return false; } }
if (TG){
  try { TG.ready(); TG.expand(); } catch (e) {}
  try { if (tgOk('6.1')){ TG.setHeaderColor('#2a74f0'); TG.setBackgroundColor('#2a74f0'); } } catch (e) {}
  try { if (tgOk('7.7')) TG.disableVerticalSwipes(); } catch (e) {}
}
function tgBack(show){
  if (!TG || !tgOk('6.1') || !TG.BackButton) return;
  try { if (show) TG.BackButton.show(); else TG.BackButton.hide(); } catch (e) {}
}
