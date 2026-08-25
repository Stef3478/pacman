/* Opstarten: koppelt invoer, HUD en de speellus aan het spel. */
(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');
  var overlay = doc.getElementById('overlay');
  var overlayTitle = doc.getElementById('overlay-title');
  var overlayText = doc.getElementById('overlay-text');
  var overlayButton = doc.getElementById('overlay-button');
  var scoreEl = doc.getElementById('score');
  var highEl = doc.getElementById('highscore');
  var levelEl = doc.getElementById('level');
  var livesEl = doc.getElementById('lives');
  var muteBtn = doc.getElementById('mute');

  var ui = {
    showOverlay: function (data) {
      if (!data) {
        overlay.hidden = true;
        return;
      }
      overlayTitle.textContent = data.title;
      overlayText.innerHTML = data.text;
      overlayButton.textContent = data.button;
      overlay.hidden = false;
    }
  };

  var game = new global.Game(canvas, ui);
  global.game = game; // handig om in de console mee te kijken

  ui.showOverlay({
    title: 'PAC-MAN',
    text: 'Pijltjestoetsen of WASD om te bewegen<br>Veeg op je telefoon &middot; P = pauze',
    button: 'Start'
  });

  /* ------------------------------------------------------------ HUD */

  var lastLives = -1;
  var lastScore = -1;
  var lastHigh = -1;
  var lastLevel = -1;

  function updateHud() {
    if (game.score !== lastScore) {
      lastScore = game.score;
      scoreEl.textContent = String(game.score).padStart(6, '0');
    }
    if (game.highScore !== lastHigh) {
      lastHigh = game.highScore;
      highEl.textContent = String(game.highScore).padStart(6, '0');
    }
    if (game.level !== lastLevel) {
      lastLevel = game.level;
      levelEl.textContent = String(game.level);
    }
    if (game.lives !== lastLives) {
      lastLives = game.lives;
      livesEl.innerHTML = '';
      for (var i = 0; i < Math.max(0, game.lives - 1); i++) {
        var span = doc.createElement('span');
        span.className = 'life';
        livesEl.appendChild(span);
      }
    }
  }

  /* --------------------------------------------------------- invoer */

  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
    z: 'up', q: 'left'
  };

  doc.addEventListener('keydown', function (ev) {
    var dir = KEYS[ev.key];
    if (dir) {
      ev.preventDefault();
      game.turn(dir);
      return;
    }
    if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
      ev.preventDefault();
      game.togglePause();
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (game.state === 'menu' || game.state === 'gameover' || game.paused) game.startFromUi();
    } else if (ev.key === 'm' || ev.key === 'M') {
      toggleMute();
    }
  });

  overlayButton.addEventListener('click', function () { game.startFromUi(); });

  // veeggebaren
  var touchStart = null;
  canvas.addEventListener('touchstart', function (ev) {
    var t = ev.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    if (game.state === 'menu' || game.state === 'gameover' || game.paused) game.startFromUi();
  }, { passive: true });

  canvas.addEventListener('touchmove', function (ev) { ev.preventDefault(); }, { passive: false });

  canvas.addEventListener('touchend', function (ev) {
    if (!touchStart) return;
    var t = ev.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) game.turn(dx > 0 ? 'right' : 'left');
    else game.turn(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  // knoppen op het scherm
  Array.prototype.forEach.call(doc.querySelectorAll('[data-dir]'), function (btn) {
    var fire = function (ev) {
      ev.preventDefault();
      game.turn(btn.getAttribute('data-dir'));
    };
    btn.addEventListener('touchstart', fire, { passive: false });
    btn.addEventListener('mousedown', fire);
  });

  doc.getElementById('pause').addEventListener('click', function () { game.togglePause(); });

  function toggleMute() {
    game.sound.setMuted(!game.sound.muted);
    muteBtn.textContent = game.sound.muted ? 'Geluid uit' : 'Geluid aan';
    muteBtn.setAttribute('aria-pressed', game.sound.muted ? 'true' : 'false');
  }
  muteBtn.textContent = game.sound.muted ? 'Geluid uit' : 'Geluid aan';
  muteBtn.addEventListener('click', toggleMute);

  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden && game.state === 'playing' && !game.paused) game.togglePause();
  });

  global.addEventListener('resize', function () { game.resize(); });

  /* ------------------------------------------------------- speellus */

  var STEP = global.GameConst.STEP;
  var accumulator = 0;
  var last = 0;

  function frame(now) {
    global.requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    if (!game.paused) {
      accumulator += dt;
      var steps = 0;
      while (accumulator >= STEP && steps < 6) {
        game.update(STEP);
        accumulator -= STEP;
        steps++;
      }
      if (steps === 6) accumulator = 0;
    }
    game.draw();
    updateHud();
  }
  global.requestAnimationFrame(frame);
})(window);
