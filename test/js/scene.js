/* Duelist · js/scene.js
   Shared canvas: the stadium background, resizing, big outlined captions. */

/* ---------- drawing ---------- */
var cv = $('pitch'), ctx = cv.getContext('2d');
var bg = document.createElement('canvas'), bgx = bg.getContext('2d');
var K = 1;

function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

var INK = '#1b1236', INKPASS = false;
function paintBg(){
  var c = bgx;
  c.setTransform(K, 0, 0, K, 0, 0);
  var zB = 30, yB = gy(zB), yT = HZ + (CH - 0.9) * F / zB;
  // stands: three colourful tiers packed with fans
  c.fillStyle = '#2c2f7c'; c.fillRect(0, 0, 400, yT + 1);
  var R = rng(11), tierH = yT / 3, fans = ['#ffd84a', '#3d9bff', '#ff8a2a', '#ff4d5e', '#ffffff', '#9b5cff', '#36c45a'];
  for (var tr = 0; tr < 3; tr++){
    var ty = tr * tierH;
    c.fillStyle = tr % 2 ? '#34388f' : '#2c2f7c'; c.fillRect(0, ty, 400, tierH);
    for (var row = 0; row < 3; row++){
      var yy = ty + 4 + row * (tierH - 4) / 3, rr = 1.9 + tr * 0.25;
      for (var x = 2 + R() * 3; x < 400; x += 5.2 + R() * 2.2){
        c.fillStyle = fans[Math.floor(R() * fans.length)];
        c.beginPath(); c.arc(x, yy + R() * 1.5, rr, 0, Math.PI * 2); c.fill();
        c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
      }
    }
    c.fillStyle = INK; c.fillRect(0, ty + tierH - 1.6, 400, 1.6);
  }
  // advertising boards: yellow with the duelist wordmark
  c.fillStyle = '#ffd84a'; c.fillRect(0, yT, 400, yB - yT);
  c.fillStyle = INK; c.fillRect(0, yT - 1, 400, 2); c.fillRect(0, yB - 1, 400, 2);
  var fs = Math.round((yB - yT) * 0.7);
  c.font = fs + 'px "Lilita One",sans-serif'; c.textBaseline = 'middle';
  for (var bx = -10, i = 0; bx < 410; i++){
    if (i % 3 === 2){
      c.fillStyle = '#3d9bff'; c.fillRect(bx, yT + 1, 46, yB - yT - 2);
      c.fillStyle = '#fff'; c.fillText('1V1', bx + 9, (yT + yB) / 2 + 0.5); bx += 56; continue;
    }
    var w = c.measureText('duelist').width;
    c.fillStyle = '#3d9bff'; c.beginPath(); c.arc(bx + 3, (yT + yB) / 2, 2.4, 0, 7); c.fill();
    c.fillStyle = INK; c.fillText('duelist', bx + 8, (yT + yB) / 2 + 0.5);
    c.fillStyle = '#ff8a2a'; c.beginPath(); c.arc(bx + 12 + w, (yT + yB) / 2, 2.4, 0, 7); c.fill();
    bx += w + 30;
  }
  // bright grass with mowing stripes
  var z = zB, k = 0;
  while (z > 2){
    var z2 = z - 1.83;
    c.fillStyle = k++ % 2 ? '#52d052' : '#45c247';
    c.fillRect(0, gy(z), 400, gy(Math.max(z2, 0.5)) - gy(z) + 1);
    z = z2;
  }
  var shade = c.createLinearGradient(0, yB, 0, yB + 60);
  shade.addColorStop(0, 'rgba(27,18,54,.22)'); shade.addColorStop(1, 'rgba(27,18,54,0)');
  c.fillStyle = shade; c.fillRect(0, yB, 400, 60);
  // pitch markings
  c.fillStyle = '#ffffff';
  var yg = gy(ZG); c.fillRect(0, yg - 0.9, 400, 1.9);
  var y6 = gy(ZG - 5.5); c.fillRect(0, y6 - 1.1, 400, 2.2);
  var sp = proj([0, 0, ZS]);
  c.beginPath(); c.ellipse(sp[0], sp[1], 0.12 * sp[2], 0.12 * sp[2] * 0.36, 0, 0, Math.PI*2); c.fill();
  // sunshine + soft edge
  var fl = c.createRadialGradient(200, -40, 10, 200, -40, 300);
  fl.addColorStop(0, 'rgba(255,250,220,.22)'); fl.addColorStop(1, 'rgba(255,250,220,0)');
  c.fillStyle = fl; c.fillRect(0, 0, 400, 300);
  var vg = c.createRadialGradient(200, 160, 150, 200, 160, 300);
  vg.addColorStop(0, 'rgba(27,18,54,0)'); vg.addColorStop(1, 'rgba(27,18,54,.22)');
  c.fillStyle = vg; c.fillRect(0, 0, 400, 300);
}

function resize(){
  var r = cv.getBoundingClientRect();
  if (!r.width) return;
  var dpr = Math.min(3, window.devicePixelRatio || 1);
  var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h){
    cv.width = w; cv.height = h; bg.width = w; bg.height = h;
    K = w / 400;
    paintBg();
  }
}


function outlineText(c, s, x, y, size, color){
  c.font = size + 'px "Lilita One",sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = Math.max(4, size * 0.22); c.strokeText(s, x, y + size * 0.06);
  c.fillStyle = color; c.fillText(s, x, y);
}
