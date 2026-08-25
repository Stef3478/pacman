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

  /* ------------------------------------------- vegen om te sturen */

  var SWIPE_THRESHOLD = 18;
  var trackpad = doc.getElementById('trackpad');
  var dot = doc.getElementById('trackpad-dot');
  var arrows = {};
  Array.prototype.forEach.call(doc.querySelectorAll('[data-arrow]'), function (el) {
    arrows[el.getAttribute('data-arrow')] = el;
  });
  var arrowTimer = null;

  function flashArrow(dirName) {
    var el = arrows[dirName];
    if (!el) return;
    Object.keys(arrows).forEach(function (k) { arrows[k].classList.remove('on'); });
    el.classList.add('on');
    clearTimeout(arrowTimer);
    arrowTimer = setTimeout(function () { el.classList.remove('on'); }, 260);
  }

  function steer(dirName) {
    game.turn(dirName);
    flashArrow(dirName);
    if (global.navigator && navigator.vibrate) navigator.vibrate(8);
  }

  // Eén veeg mag meerdere bochten opleveren: na elke richting verspringt het
  // ankerpunt, dus een L-vorm geeft meteen ook de volgende afslag door.
  function attachSwipe(el, options) {
    var anchor = null;
    var swiped = false;
    var lastDir = null;

    function begin(ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      anchor = { x: ev.clientX, y: ev.clientY };
      swiped = false;
      lastDir = null;
      if (el.setPointerCapture) {
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* niet erg */ }
      }
      if (options.onPress) options.onPress(ev);
      ev.preventDefault();
    }

    function drag(ev) {
      if (!anchor) return;
      if (options.onDrag) options.onDrag(ev);
      var dx = ev.clientX - anchor.x;
      var dy = ev.clientY - anchor.y;
      var horizontal = Math.abs(dx) > Math.abs(dy);
      var along = horizontal ? Math.abs(dx) : Math.abs(dy);
      var across = horizontal ? Math.abs(dy) : Math.abs(dx);
      if (along < SWIPE_THRESHOLD) return;
      // schuin vegen telt pas als één richting duidelijk wint
      if (across > along * 0.7) return;

      var dirName = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      anchor = { x: ev.clientX, y: ev.clientY };
      ev.preventDefault();
      if (dirName === lastDir) return; // doorvegen in dezelfde richting: niets nieuws
      lastDir = dirName;
      swiped = true;
      steer(dirName);
    }

    function finish(ev) {
      var wasDown = anchor !== null;
      anchor = null;
      if (wasDown && !swiped && options.onTap) options.onTap();
      if (options.onRelease) options.onRelease(ev);
    }

    el.addEventListener('pointerdown', begin);
    el.addEventListener('pointermove', drag);
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  }

  function wake() {
    if (game.state === 'menu' || game.state === 'gameover' || game.paused) game.startFromUi();
  }

  function moveDot(ev) {
    var rect = trackpad.getBoundingClientRect();
    dot.hidden = false;
    dot.style.left = (ev.clientX - rect.left) + 'px';
    dot.style.top = (ev.clientY - rect.top) + 'px';
  }

  attachSwipe(trackpad, {
    onPress: function (ev) { trackpad.classList.add('active'); moveDot(ev); wake(); },
    onDrag: moveDot,
    onRelease: function () { trackpad.classList.remove('active'); dot.hidden = true; }
  });

  // op het speelveld zelf werkt vegen ook gewoon
  attachSwipe(canvas, { onTap: wake });

  // veegveld tonen zodra er een aanraakscherm meedoet
  function markTouch() {
    doc.body.classList.add('has-touch');
    game.resize();
  }
  if ((global.navigator && navigator.maxTouchPoints > 0) || 'ontouchstart' in global) markTouch();
  else global.addEventListener('touchstart', markTouch, { once: true, passive: true });


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
