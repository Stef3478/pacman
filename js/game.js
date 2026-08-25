/* Spellogica, invoer en tekenen. */
(function (global) {
  'use strict';

  var M = global.Maze;
  var E = global.Entities;
  var TILE = M.TILE;
  var WIDTH = M.COLS * TILE;
  var HEIGHT = M.ROWS * TILE;
  var STEP = 1 / 60;

  var FRUITS = [
    { name: 'kers', points: 100, color: '#ff2d3c' },
    { name: 'aardbei', points: 300, color: '#ff5470' },
    { name: 'sinaasappel', points: 500, color: '#ffa02e' },
    { name: 'appel', points: 700, color: '#e01d2c' },
    { name: 'meloen', points: 1000, color: '#6ee36e' },
    { name: 'galaxian', points: 2000, color: '#4fc3ff' },
    { name: 'bel', points: 3000, color: '#ffe14f' },
    { name: 'sleutel', points: 5000, color: '#c9d4ff' }
  ];

  function Game(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.sound = new global.Sound();
    this.mazeCanvas = M.renderMaze('#1f4dff');
    this.mazeFlash = M.renderMaze('#dfe6ff');
    this.pacman = new E.Pacman();
    this.ghosts = [
      new E.Ghost('blinky', '#ff2d2d', { col: M.HOUSE_EXIT.col, row: M.HOUSE_EXIT.row }, { col: 25, row: 0 }, 0, { col: 13, row: 14 }),
      new E.Ghost('pinky', '#ffb8ff', { col: 13, row: 14 }, { col: 2, row: 0 }, 0),
      new E.Ghost('inky', '#4ff5ff', { col: 11, row: 14 }, { col: 27, row: 30 }, 30),
      new E.Ghost('clyde', '#ffb04f', { col: 16, row: 14 }, { col: 0, row: 30 }, 60)
    ];
    this.highScore = 0;
    try { this.highScore = parseInt(localStorage.getItem('pacman-highscore') || '0', 10) || 0; } catch (e) {}
    this.state = 'menu';
    this.paused = false;
    this.time = 0;
    this.popups = [];
    this.resize();
    this.newGame(true);
    this.state = 'menu';
  }

  Game.prototype.rand = function () { return Math.random(); };

  Game.prototype.resize = function () {
    var dpr = Math.min(3, global.devicePixelRatio || 1);
    this.canvas.width = WIDTH * dpr;
    this.canvas.height = HEIGHT * dpr;
    this.canvas.style.aspectRatio = WIDTH + ' / ' + HEIGHT;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Game.prototype.newGame = function (silent) {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.extraLifeGiven = false;
    this.startLevel();
    if (!silent) this.sound.start();
  };

  Game.prototype.startLevel = function () {
    this.grid = M.createGrid();
    this.pelletsLeft = M.countPellets(this.grid);
    this.dotsThisLevel = 0;
    this.fruit = null;
    this.fruitsShown = 0;
    this.popups = [];
    this.resetRound();
  };

  // Zet Pac-Man en de spoken terug op hun startplek (na een leven of nieuw level).
  Game.prototype.resetRound = function () {
    this.pacman.reset();
    this.ghosts.forEach(function (g) { g.reset(); });
    this.mode = 'scatter';
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.frightTimer = 0;
    this.ghostCombo = 0;
    this.dotsThisLife = 0;
    this.readyTimer = 2;
    this.state = 'ready';
  };

  Game.prototype.modeSchedule = function () {
    var lvl = this.level;
    var scatter = lvl >= 5 ? 4 : (lvl >= 2 ? 5 : 7);
    return [scatter, 20, scatter, 20, 5, 20, 5, Infinity];
  };

  Game.prototype.frightDuration = function () {
    return Math.max(1, 8 - (this.level - 1) * 0.6);
  };

  Game.prototype.mayRelease = function (ghost) {
    if (this.state !== 'playing') return false;
    if (ghost.revived) return ghost.houseTimer > 0.8;
    return this.dotsThisLife >= ghost.releaseDots || ghost.houseTimer >= 4 + ghost.releaseDots / 30;
  };

  Game.prototype.addScore = function (points) {
    this.score += points;
    if (!this.extraLifeGiven && this.score >= 10000) {
      this.extraLifeGiven = true;
      this.lives++;
      this.sound.extraLife();
    }
    if (this.score > this.highScore) this.saveHighScore();
  };

  Game.prototype.saveHighScore = function () {
    if (this.score > this.highScore) this.highScore = this.score;
    try { localStorage.setItem('pacman-highscore', String(this.highScore)); } catch (e) {}
  };

  Game.prototype.popup = function (text, x, y, color) {
    this.popups.push({ text: text, x: x, y: y, color: color || '#8ef7ff', life: 1.1 });
  };

  /* ------------------------------------------------------------ invoer */

  Game.prototype.turn = function (dirName) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.startFromUi();
      return;
    }
    this.pacman.turn(dirName);
  };

  Game.prototype.startFromUi = function () {
    this.sound.ensure();
    if (this.state === 'menu' || this.state === 'gameover') {
      this.newGame(false);
      this.paused = false;
    } else if (this.paused) {
      this.paused = false;
    }
    this.ui.showOverlay(null);
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'menu' || this.state === 'gameover') return;
    this.paused = !this.paused;
    this.ui.showOverlay(this.paused ? { title: 'PAUZE', text: 'Druk op P of tik om verder te spelen', button: 'Verder' } : null);
  };

  /* ------------------------------------------------------------- update */

  Game.prototype.update = function (dt) {
    this.time += dt;
    this.popups = this.popups.filter(function (p) { p.life -= dt; p.y -= dt * 12; return p.life > 0; });

    if (this.state === 'ready') {
      this.readyTimer -= dt;
      if (this.readyTimer <= 0) this.state = 'playing';
      return;
    }

    if (this.state === 'dying') {
      this.pacman.update(this.grid, dt);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'gameover';
          this.saveHighScore();
          this.ui.showOverlay({
            title: 'GAME OVER',
            text: 'Score: ' + this.score + (this.score >= this.highScore ? '  —  nieuw record!' : ''),
            button: 'Opnieuw spelen'
          });
        } else {
          this.resetRound();
        }
      }
      return;
    }

    if (this.state === 'levelclear') {
      this.levelTimer -= dt;
      if (this.levelTimer <= 0) {
        this.level++;
        this.startLevel();
      }
      return;
    }

    if (this.state !== 'playing') return;

    // scatter / chase / frightened
    if (this.frightTimer > 0) {
      this.frightTimer -= dt;
      if (this.frightTimer <= 0) {
        this.frightTimer = 0;
        this.ghosts.forEach(function (g) { g.setFrightened(false); });
      }
    } else {
      var schedule = this.modeSchedule();
      this.modeTimer += dt;
      if (this.modeTimer >= schedule[this.modeIndex]) {
        this.modeTimer = 0;
        this.modeIndex = Math.min(this.modeIndex + 1, schedule.length - 1);
        this.mode = (this.modeIndex % 2 === 0) ? 'scatter' : 'chase';
        this.ghosts.forEach(function (g) {
          if (g.mode === 'roam') { g.reverseQueued = true; g.lastDecision = null; }
        });
      }
    }

    this.pacman.update(this.grid, dt);
    this.eatTile();

    var self = this;
    this.ghosts.forEach(function (g) { g.update(self, dt); });
    this.checkGhostCollisions();

    // fruit
    if (this.fruit) {
      this.fruit.timer -= dt;
      if (this.fruit.timer <= 0) this.fruit = null;
      else if (this.pacman.row() === M.FRUIT_TILE.row &&
               (this.pacman.col() === M.FRUIT_TILE.col || this.pacman.col() === M.FRUIT_TILE.col + 1)) {
        this.addScore(this.fruit.points);
        this.popup('+' + this.fruit.points, this.pacman.x, this.pacman.y, '#ffd7f5');
        this.sound.fruit();
        this.fruit = null;
      }
    }

    if (this.pelletsLeft <= 0) {
      this.state = 'levelclear';
      this.levelTimer = 2.4;
      this.sound.levelUp();
    }
  };

  Game.prototype.eatTile = function () {
    var col = M.wrapCol(this.pacman.col());
    var row = this.pacman.row();
    if (row < 0 || row >= M.ROWS) return;
    var t = this.grid[row][col];
    if (t !== M.PELLET && t !== M.POWER) return;

    // alleen opeten als Pac-Man dicht genoeg bij het midden van de tegel is
    var dx = Math.abs(this.pacman.x - M.centerX(col));
    var dy = Math.abs(this.pacman.y - M.centerY(row));
    if (dx > TILE * 0.5 || dy > TILE * 0.5) return;

    this.grid[row][col] = M.EMPTY;
    this.pelletsLeft--;
    this.dotsThisLevel++;
    this.dotsThisLife++;

    if (t === M.PELLET) {
      this.addScore(10);
      this.sound.waka();
    } else {
      this.addScore(50);
      this.sound.power();
      this.frightTimer = this.frightDuration();
      this.ghostCombo = 0;
      this.ghosts.forEach(function (g) { g.setFrightened(true); });
    }

    if ((this.dotsThisLevel === 70 || this.dotsThisLevel === 170) && this.fruitsShown < 2) {
      this.fruitsShown++;
      var f = FRUITS[Math.min(FRUITS.length - 1, this.level - 1)];
      this.fruit = { points: f.points, color: f.color, name: f.name, timer: 9.5 };
    }
  };

  Game.prototype.checkGhostCollisions = function () {
    var pac = this.pacman;
    for (var i = 0; i < this.ghosts.length; i++) {
      var g = this.ghosts[i];
      if (g.mode === 'eyes' || g.mode === 'entering' || g.mode === 'house') continue;
      if (Math.hypot(g.x - pac.x, g.y - pac.y) > TILE * 0.8) continue;

      if (g.frightened) {
        this.ghostCombo++;
        var points = 200 * Math.pow(2, Math.min(3, this.ghostCombo - 1));
        this.addScore(points);
        this.popup(String(points), g.x, g.y, '#8ef7ff');
        this.sound.eatGhost();
        g.eaten();
      } else {
        this.die();
        return;
      }
    }
  };

  Game.prototype.die = function () {
    this.state = 'dying';
    this.deathTimer = 2.1;
    this.pacman.dying = true;
    this.pacman.deathTime = 0;
    this.frightTimer = 0;
    this.fruit = null;
    this.sound.death();
  };

  /* ------------------------------------------------------------ tekenen */

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    var flashing = this.state === 'levelclear' && Math.floor(this.levelTimer * 5) % 2 === 0;
    ctx.drawImage(flashing ? this.mazeFlash : this.mazeCanvas, 0, 0, WIDTH, HEIGHT);

    if (this.state !== 'levelclear') this.drawPellets(ctx);
    if (this.fruit) this.drawFruit(ctx, M.centerX(M.FRUIT_TILE.col) + TILE / 2, M.centerY(M.FRUIT_TILE.row), this.fruit.color);

    if (this.state !== 'levelclear') {
      var self = this;
      this.ghosts.forEach(function (g) {
        if (self.state === 'dying') return;
        g.draw(ctx, self);
      });
      this.pacman.draw(ctx);
    }

    ctx.save();
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    this.popups.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.restore();

    if (this.state === 'ready') {
      ctx.save();
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe600';
      ctx.fillText('KLAAR!', WIDTH / 2, M.centerY(17) + 4);
      ctx.restore();
    }
  };

  Game.prototype.drawPellets = function (ctx) {
    var pulse = 3 + Math.sin(this.time * 6) * 1.6;
    ctx.save();
    ctx.fillStyle = '#ffe9b0';
    for (var r = 0; r < M.ROWS; r++) {
      for (var c = 0; c < M.COLS; c++) {
        var t = this.grid[r][c];
        if (t === M.PELLET) {
          ctx.fillRect(c * TILE + TILE / 2 - 1.5, r * TILE + TILE / 2 - 1.5, 3, 3);
        } else if (t === M.POWER) {
          ctx.beginPath();
          ctx.arc(M.centerX(c), M.centerY(r), pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  Game.prototype.drawFruit = function (ctx, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x - 3, y + 2, 5, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 3, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5bd75b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 3);
    ctx.quadraticCurveTo(x + 2, y - 9, x + 7, y - 6);
    ctx.stroke();
    ctx.restore();
  };

  global.Game = Game;
  global.GameConst = { WIDTH: WIDTH, HEIGHT: HEIGHT, STEP: STEP, FRUITS: FRUITS };
})(typeof window !== 'undefined' ? window : globalThis);
