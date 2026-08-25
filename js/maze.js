/* Maze data en hulpfuncties voor het doolhof. */
(function (global) {
  'use strict';

  // 28 kolommen x 31 rijen, net als het origineel.
  //  #  muur      .  pil        o  power-pil
  //  -  spookdeur ' ' leeg
  var RAW_MAZE = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.#####.##.#####.######',
    '######.#####.##.#####.######',
    '######.##..........##.######',
    '######.##.###--###.##.######',
    '######.##.#      #.##.######',
    '    ......#      #......    ',
    '######.##.#      #.##.######',
    '######.##.########.##.######',
    '######.##..........##.######',
    '######.##.########.##.######',
    '######.##.########.##.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#o..##................##..o#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '#..........................#',
    '############################'
  ];

  var COLS = 28;
  var ROWS = 31;
  var TILE = 16;

  var WALL = '#';
  var DOOR = '-';
  var PELLET = '.';
  var POWER = 'o';
  var EMPTY = ' ';

  // Vaste posities in tegels.
  var PAC_START = { col: 13, row: 23 };
  var HOUSE_EXIT = { col: 13, row: 11 };   // tegel net boven de deur
  var HOUSE_CENTER = { col: 13, row: 14 };
  var FRUIT_TILE = { col: 13, row: 17 };
  var TUNNEL_ROW = 14;

  function createGrid() {
    return RAW_MAZE.map(function (row) { return row.split(''); });
  }

  function countPellets(grid) {
    var n = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] === PELLET || grid[r][c] === POWER) n++;
      }
    }
    return n;
  }

  function wrapCol(col) {
    if (col < 0) return COLS + (col % COLS);
    if (col >= COLS) return col % COLS;
    return col;
  }

  function tileAt(grid, col, row) {
    if (row < 0 || row >= ROWS) return WALL;
    return grid[row][wrapCol(col)];
  }

  // Muur voor Pac-Man: echte muren en de spookdeur.
  function blockedForPac(grid, col, row) {
    var t = tileAt(grid, col, row);
    return t === WALL || t === DOOR;
  }

  // Muur voor een spook; de deur mag alleen als het spook naar buiten of
  // naar binnen gaat.
  function blockedForGhost(grid, col, row, doorOpen) {
    var t = tileAt(grid, col, row);
    if (t === DOOR) return !doorOpen;
    return t === WALL;
  }

  function centerX(col) { return col * TILE + TILE / 2; }
  function centerY(row) { return row * TILE + TILE / 2; }

  function isWallChar(ch) { return ch === WALL; }

  function roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Tekent het doolhof één keer op een offscreen canvas.
  // De muren worden als één samenhangende vorm gevuld en daarna van binnen
  // weer weggehaald, zodat er een dunne, klassieke muurlijn overblijft.
  function paintWalls(ctx, grid, inset, radius, fillCorners) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!isWallChar(grid[r][c])) continue;
        var x = c * TILE;
        var y = r * TILE;
        var size = TILE - inset * 2;
        if (size <= 0) continue;
        roundRect(ctx, x + inset, y + inset, size, size, Math.min(radius, size / 2));
        ctx.fill();

        if (c + 1 < COLS && isWallChar(grid[r][c + 1])) {
          ctx.fillRect(x + TILE - inset - 1, y + inset, inset * 2 + 2, size);
        }
        if (r + 1 < ROWS && isWallChar(grid[r + 1][c])) {
          ctx.fillRect(x + inset, y + TILE - inset - 1, size, inset * 2 + 2);
        }

        // hoekpunt midden in een dikke muur: helemaal dichtgooien
        if (fillCorners && c + 1 < COLS && r + 1 < ROWS &&
            isWallChar(grid[r][c + 1]) && isWallChar(grid[r + 1][c]) &&
            isWallChar(grid[r + 1][c + 1])) {
          ctx.fillRect(x + TILE - inset - 1, y + TILE - inset - 1,
                       inset * 2 + 2, inset * 2 + 2);
        }
      }
    }
  }

  function renderMaze(color, background) {
    var canvas = document.createElement('canvas');
    canvas.width = COLS * TILE;
    canvas.height = ROWS * TILE;
    var ctx = canvas.getContext('2d');
    var grid = createGrid();

    // buitenvorm in de muurkleur
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
    ctx.fillStyle = color;
    paintWalls(ctx, grid, 2, 6);
    ctx.restore();

    // binnenkant weer weghalen: er blijft een lijn van ongeveer 3px over
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    paintWalls(ctx, grid, 5, 3, true);
    ctx.restore();

    // de deur van het spookhuis
    ctx.fillStyle = '#ffb8ff';
    for (var rr = 0; rr < ROWS; rr++) {
      for (var cc = 0; cc < COLS; cc++) {
        if (grid[rr][cc] === DOOR) {
          ctx.fillRect(cc * TILE, rr * TILE + TILE / 2 - 2, TILE, 4);
        }
      }
    }
    return canvas;
  }

  global.Maze = {
    RAW_MAZE: RAW_MAZE,
    COLS: COLS,
    ROWS: ROWS,
    TILE: TILE,
    WALL: WALL,
    DOOR: DOOR,
    PELLET: PELLET,
    POWER: POWER,
    EMPTY: EMPTY,
    PAC_START: PAC_START,
    HOUSE_EXIT: HOUSE_EXIT,
    HOUSE_CENTER: HOUSE_CENTER,
    FRUIT_TILE: FRUIT_TILE,
    TUNNEL_ROW: TUNNEL_ROW,
    createGrid: createGrid,
    countPellets: countPellets,
    wrapCol: wrapCol,
    tileAt: tileAt,
    blockedForPac: blockedForPac,
    blockedForGhost: blockedForGhost,
    centerX: centerX,
    centerY: centerY,
    roundRect: roundRect,
    renderMaze: renderMaze
  };
})(typeof window !== 'undefined' ? window : globalThis);
