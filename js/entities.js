/* Pac-Man en de vier spoken. */
(function (global) {
  'use strict';

  var M = global.Maze;
  var TILE = M.TILE;

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    none: { x: 0, y: 0 }
  };
  // Volgorde bij gelijke afstand: boven, links, onder, rechts (zoals in het origineel).
  var DIR_ORDER = ['up', 'left', 'down', 'right'];

  function opposite(name) {
    return { up: 'down', down: 'up', left: 'right', right: 'left', none: 'none' }[name];
  }

  /* ---------------------------------------------------------------- basis */

  function Entity(col, row) {
    this.x = M.centerX(col);
    this.y = M.centerY(row);
    this.dirName = 'left';
    this.dir = DIRS.left;
    this.speed = 1.8;
  }

  Entity.prototype.col = function () { return Math.floor(this.x / TILE); };
  Entity.prototype.row = function () { return Math.floor(this.y / TILE); };

  Entity.prototype.setTile = function (col, row) {
    this.x = M.centerX(col);
    this.y = M.centerY(row);
  };

  Entity.prototype.atCenter = function (tolerance) {
    var cx = M.centerX(this.col());
    var cy = M.centerY(this.row());
    return Math.abs(this.x - cx) <= tolerance && Math.abs(this.y - cy) <= tolerance;
  };

  Entity.prototype.wrap = function () {
    var w = M.COLS * TILE;
    if (this.x < -TILE / 2) this.x += w;
    else if (this.x > w + TILE / 2) this.x -= w;
  };

  // Beweegt één stap en stopt netjes op het midden van een tegel voor een muur.
  Entity.prototype.step = function (blocked) {
    var col = this.col();
    var row = this.row();
    var cx = M.centerX(col);
    var cy = M.centerY(row);
    var nx = this.x + this.dir.x * this.speed;
    var ny = this.y + this.dir.y * this.speed;

    if (blocked(col + this.dir.x, row + this.dir.y)) {
      if (this.dir.x > 0) nx = Math.min(nx, cx);
      else if (this.dir.x < 0) nx = Math.max(nx, cx);
      if (this.dir.y > 0) ny = Math.min(ny, cy);
      else if (this.dir.y < 0) ny = Math.max(ny, cy);
    }
    this.x = nx;
    this.y = ny;
    this.wrap();
  };

  /* ------------------------------------------------------------- Pac-Man */

  function Pacman() {
    Entity.call(this, M.PAC_START.col, M.PAC_START.row);
    this.reset();
  }
  Pacman.prototype = Object.create(Entity.prototype);
  Pacman.prototype.constructor = Pacman;

  Pacman.prototype.reset = function () {
    this.setTile(M.PAC_START.col, M.PAC_START.row);
    this.dirName = 'left';
    this.dir = DIRS.left;
    this.wanted = 'left';
    this.speed = 1.9;
    this.mouth = 0;
    this.moving = false;
    this.dying = false;
    this.deathTime = 0;
  };

  Pacman.prototype.turn = function (dirName) {
    this.wanted = dirName;
  };

  Pacman.prototype.update = function (grid, dt) {
    if (this.dying) {
      this.deathTime += dt;
      return;
    }
    var blocked = function (c, r) { return M.blockedForPac(grid, c, r); };
    var col = this.col();
    var row = this.row();
    var cx = M.centerX(col);
    var cy = M.centerY(row);
    var want = DIRS[this.wanted];

    if (this.wanted !== this.dirName && want) {
      if (this.wanted === opposite(this.dirName)) {
        // omdraaien mag altijd en overal
        this.dirName = this.wanted;
        this.dir = want;
      } else if (!blocked(col + want.x, row + want.y)) {
        // afslaan mag zodra we dicht genoeg bij het midden zijn
        var offset = want.y !== 0 ? Math.abs(this.x - cx) : Math.abs(this.y - cy);
        if (offset <= this.speed) {
          if (want.y !== 0) this.x = cx; else this.y = cy;
          this.dirName = this.wanted;
          this.dir = want;
        }
      }
    }

    var beforeX = this.x, beforeY = this.y;
    this.step(blocked);
    this.moving = (this.x !== beforeX || this.y !== beforeY);
    if (this.moving) this.mouth += dt * 11;
  };

  Pacman.prototype.draw = function (ctx) {
    var r = TILE * 0.72;
    var angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.dirName] || 0;
    var open;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.dying) {
      // sterfanimatie: de mond gaat helemaal open tot Pac-Man verdwijnt
      var t = Math.min(1, this.deathTime / 1.3);
      open = t * Math.PI;
      ctx.rotate(angle);
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      if (t < 1) {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * (1 - t * 0.35), open, Math.PI * 2 - open);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    open = (this.moving ? (Math.abs(Math.sin(this.mouth)) * 0.32 + 0.03) : 0.18) * Math.PI;
    ctx.rotate(angle);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = 'rgba(255,230,0,0.65)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, open, Math.PI * 2 - open);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  /* --------------------------------------------------------------- spoken */

  // mode: 'house' | 'leaving' | 'roam' | 'eyes' | 'entering'
  function Ghost(name, color, home, scatterTile, releaseDots, respawn) {
    Entity.call(this, home.col, home.row);
    this.name = name;
    this.color = color;
    this.home = home;              // startplek aan het begin van een ronde
    this.respawn = respawn || home; // plek in het huis na opgegeten te zijn
    this.scatterTile = scatterTile;
    this.releaseDots = releaseDots;
    this.reset();
  }
  Ghost.prototype = Object.create(Entity.prototype);
  Ghost.prototype.constructor = Ghost;

  Ghost.prototype.reset = function () {
    this.setTile(this.home.col, this.home.row);
    this.dirName = this.name === 'blinky' ? 'left' : 'up';
    this.dir = DIRS[this.dirName];
    this.mode = this.name === 'blinky' ? 'roam' : 'house';
    this.frightened = false;
    this.speed = 1.75;
    this.bob = 0;
    this.lastDecision = null;
    this.houseTimer = 0;
    this.reverseQueued = false;
    this.eyesOnly = false;
    this.revived = false;
  };

  // In welke rij wiebelt dit spook binnen het huis?
  Ghost.prototype.houseRow = function () {
    return this.revived ? this.respawn.row : this.home.row;
  };

  Ghost.prototype.baseSpeed = function (game) {
    var boost = Math.min(0.22, (game.level - 1) * 0.035);
    if (this.mode === 'eyes' || this.mode === 'entering') return 4.4;
    if (this.frightened) return 1.05 + boost * 0.4;
    if (this.row() === M.TUNNEL_ROW && (this.col() <= 4 || this.col() >= 23)) return 1.0;
    // Blinky wordt sneller als er weinig pillen over zijn ("Cruise Elroy")
    var elroy = (this.name === 'blinky' && game.pelletsLeft < 40) ? 0.2 : 0;
    return 1.72 + boost + elroy;
  };

  Ghost.prototype.target = function (game) {
    if (this.mode === 'eyes') return { col: M.HOUSE_EXIT.col, row: M.HOUSE_EXIT.row };
    if (game.mode === 'scatter' && !this.frightened) return this.scatterTile;

    var pac = game.pacman;
    var pc = pac.col();
    var pr = pac.row();
    var d = pac.dir;

    switch (this.name) {
      case 'blinky':
        return { col: pc, row: pr };
      case 'pinky':
        return { col: pc + d.x * 4, row: pr + d.y * 4 };
      case 'inky': {
        var bx = game.ghosts[0].col();
        var by = game.ghosts[0].row();
        var ax = pc + d.x * 2;
        var ay = pr + d.y * 2;
        return { col: ax + (ax - bx), row: ay + (ay - by) };
      }
      case 'clyde': {
        var dist = Math.hypot(pc - this.col(), pr - this.row());
        return dist > 8 ? { col: pc, row: pr } : this.scatterTile;
      }
    }
    return { col: pc, row: pr };
  };

  Ghost.prototype.chooseDirection = function (game) {
    var grid = game.grid;
    var col = this.col();
    var row = this.row();
    var doorOpen = (this.mode === 'eyes' || this.mode === 'entering' || this.mode === 'leaving');
    var self = this;
    var options = DIR_ORDER.filter(function (name) {
      if (name === opposite(self.dirName) && !self.reverseQueued) return false;
      var d = DIRS[name];
      return !M.blockedForGhost(grid, col + d.x, row + d.y, doorOpen);
    });
    this.reverseQueued = false;

    if (options.length === 0) {
      this.dirName = opposite(this.dirName);
      this.dir = DIRS[this.dirName];
      return;
    }
    if (options.length === 1) {
      this.dirName = options[0];
      this.dir = DIRS[this.dirName];
      return;
    }

    var pick;
    if (this.frightened && this.mode === 'roam') {
      pick = options[Math.floor(game.rand() * options.length)];
    } else {
      var t = this.target(game);
      var best = Infinity;
      options.forEach(function (name) {
        var d = DIRS[name];
        var dx = (col + d.x) - t.col;
        var dy = (row + d.y) - t.row;
        var dist = dx * dx + dy * dy;
        if (dist < best) { best = dist; pick = name; }
      });
    }
    this.dirName = pick;
    this.dir = DIRS[pick];
  };

  Ghost.prototype.update = function (game, dt) {
    this.speed = this.baseSpeed(game);

    if (this.mode === 'house') {
      // op en neer wiebelen tot het spook vrijgelaten wordt
      this.bob += dt * 4;
      this.y = M.centerY(this.houseRow()) + Math.sin(this.bob) * 4;
      this.houseTimer += dt;
      if (game.mayRelease(this)) {
        this.mode = 'leaving';
        this.revived = false;
        this.y = M.centerY(this.houseRow());
      }
      return;
    }

    if (this.mode === 'leaving') {
      var exitX = M.centerX(M.HOUSE_EXIT.col);
      var exitY = M.centerY(M.HOUSE_EXIT.row);
      var sp = 1.5;
      if (Math.abs(this.x - exitX) > sp) {
        this.x += Math.sign(exitX - this.x) * sp;
        this.dirName = exitX > this.x ? 'right' : 'left';
      } else {
        this.x = exitX;
        this.y -= sp;
        this.dirName = 'up';
        if (this.y <= exitY) {
          this.y = exitY;
          this.mode = 'roam';
          this.dirName = game.rand() < 0.5 ? 'left' : 'right';
          this.lastDecision = null;
        }
      }
      this.dir = DIRS[this.dirName];
      return;
    }

    if (this.mode === 'entering') {
      var hx = M.centerX(this.respawn.col);
      var hy = M.centerY(this.respawn.row);
      var s = 2.6;
      if (Math.abs(this.x - hx) > s) {
        this.x += Math.sign(hx - this.x) * s;
      } else if (Math.abs(this.y - hy) > s) {
        this.x = hx;
        this.y += Math.sign(hy - this.y) * s;
        this.dirName = 'down';
        this.dir = DIRS.down;
      } else {
        this.x = hx;
        this.y = hy;
        this.mode = 'house';
        this.frightened = false;
        this.eyesOnly = false;
        this.houseTimer = 0;
        this.bob = 0;
        this.revived = true;
      }
      return;
    }

    // 'roam' en 'eyes': beslissen op het midden van elke tegel
    var tol = this.speed;
    if (this.atCenter(tol)) {
      var key = this.col() + ',' + this.row();
      if (this.lastDecision !== key) {
        this.lastDecision = key;
        this.x = M.centerX(this.col());
        this.y = M.centerY(this.row());
        if (this.mode === 'eyes' &&
            this.col() === M.HOUSE_EXIT.col && this.row() === M.HOUSE_EXIT.row) {
          this.mode = 'entering';
          return;
        }
        this.chooseDirection(game);
      }
    }

    var doorOpen = (this.mode === 'eyes');
    var grid = game.grid;
    this.step(function (c, r) { return M.blockedForGhost(grid, c, r, doorOpen); });
  };

  Ghost.prototype.setFrightened = function (on) {
    if (this.mode === 'eyes' || this.mode === 'entering') return;
    if (on && !this.frightened) this.reverseQueued = true;
    this.frightened = on;
    if (on) this.lastDecision = null;
  };

  Ghost.prototype.eaten = function () {
    this.mode = 'eyes';
    this.frightened = false;
    this.eyesOnly = true;
    this.lastDecision = null;
  };

  Ghost.prototype.draw = function (ctx, game) {
    var r = TILE * 0.72;
    var x = this.x;
    var y = this.y;
    var body;

    if (this.mode === 'eyes' || this.mode === 'entering') {
      drawEyes(ctx, x, y, r, this.dir, '#ffffff', '#2121ff');
      return;
    }

    if (this.frightened) {
      var flashing = game.frightTimer < 2 && Math.floor(game.frightTimer * 6) % 2 === 0;
      body = flashing ? '#ffffff' : '#2233dd';
    } else {
      body = this.color;
    }

    ctx.save();
    ctx.fillStyle = body;
    ctx.shadowColor = body;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y - 1, r, Math.PI, 0);
    ctx.lineTo(x + r, y + r * 0.85);
    // golvende onderkant
    var feet = 3;
    var w = (r * 2) / feet;
    var wobble = Math.floor(game.time * 8) % 2 === 0 ? 1 : -1;
    for (var i = 0; i < feet; i++) {
      var x0 = x + r - i * w;
      ctx.quadraticCurveTo(x0 - w * 0.25, y + r * 0.85 + wobble * 4, x0 - w * 0.5, y + r * 0.85);
      ctx.quadraticCurveTo(x0 - w * 0.75, y + r * 0.85 - wobble * 4, x0 - w, y + r * 0.85);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (this.frightened) {
      var fc = (game.frightTimer < 2 && Math.floor(game.frightTimer * 6) % 2 === 0) ? '#ff0000' : '#ffffff';
      ctx.fillStyle = fc;
      ctx.fillRect(x - r * 0.45, y - r * 0.25, 3, 3);
      ctx.fillRect(x + r * 0.2, y - r * 0.25, 3, 3);
      ctx.strokeStyle = fc;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      var mx = x - r * 0.6;
      ctx.moveTo(mx, y + r * 0.4);
      for (var k = 0; k < 3; k++) {
        ctx.lineTo(mx + r * 0.2 + k * r * 0.4, y + r * 0.15);
        ctx.lineTo(mx + r * 0.4 + k * r * 0.4, y + r * 0.4);
      }
      ctx.stroke();
      return;
    }

    drawEyes(ctx, x, y, r, this.dir, '#ffffff', '#2121ff');
  };

  function drawEyes(ctx, x, y, r, dir, white, pupil) {
    var ox = dir.x * r * 0.22;
    var oy = dir.y * r * 0.22;
    ctx.save();
    ctx.fillStyle = white;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.ellipse(x + side * r * 0.34, y - r * 0.12, r * 0.28, r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = pupil;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(x + side * r * 0.34 + ox, y - r * 0.12 + oy, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  global.Entities = {
    DIRS: DIRS,
    opposite: opposite,
    Pacman: Pacman,
    Ghost: Ghost
  };
})(typeof window !== 'undefined' ? window : globalThis);
