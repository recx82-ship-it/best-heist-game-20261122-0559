// Bootstrap for The Midnight Vault: input, the game loop, shot staging for
// screenshots, and a headless self-test (?selftest=1) that exercises the
// simulation and reports the result in the page title and a #selftest node.

import { buildWorld, stepWorld } from './world.js';
import { draw } from './render.js';
import { ensureAudio, setMuted, isMuted, sfx } from './audio.js';
import { FIELD } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1');

// Deterministic tiny RNG (mulberry32) for shot staging.
function rngFrom(n) {
  let a = n >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const game = {
  state: 'title', // title | playing | paused | caught | win
  world: buildWorld(),
};

const input = { left: false, right: false, up: false, down: false, sneak: false, crack: false, target: null, toss: null };

// ---- error reporting: headless runs read the title ----
window.addEventListener('error', (event) => {
  document.title = `ERROR: ${event.message}`;
});
window.addEventListener('unhandledrejection', (event) => {
  document.title = `ERROR: ${event.reason}`;
});

function beginGame() {
  game.world = buildWorld();
  game.state = 'playing';
  input.target = null;
  input.toss = null;
}

// ---- keyboard ----
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'crack',
};

window.addEventListener('keydown', (event) => {
  const dir = KEYMAP[event.code];
  if (dir) {
    input[dir] = true;
    if (dir !== 'crack') input.target = null;
    event.preventDefault();
  }
  if (event.code === 'Space') {
    if (game.state === 'playing' && game.world.coins > 0) {
      const rect = canvas.getBoundingClientRect();
      const mx = (window.__vaultMouse?.x ?? game.world.player.x) - rect.left;
      const my = (window.__vaultMouse?.y ?? game.world.player.y) - rect.top;
      const scale = canvas.width / rect.width;
      input.toss = { x: mx * scale, y: my * scale };
      sfx.coin();
    }
    event.preventDefault();
  }
  if (event.code === 'Enter') {
    ensureAudio();
    if (game.state === 'title' || game.state === 'win') beginGame();
  }
  if (event.code === 'KeyR') {
    if (game.state === 'caught' || game.state === 'playing' || game.state === 'paused') beginGame();
  }
  if (event.code === 'KeyP') {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
  }
  if (event.code === 'KeyM') {
    setMuted(!isMuted());
  }
});

window.addEventListener('keyup', (event) => {
  const dir = KEYMAP[event.code];
  if (dir) input[dir] = false;
});

// ---- mouse: click to walk, right-click tosses a coin ----
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
}

canvas.addEventListener('mousemove', (event) => {
  window.__vaultMouse = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener('click', (event) => {
  ensureAudio();
  if (game.state === 'title' || game.state === 'win') {
    beginGame();
    return;
  }
  if (game.state !== 'playing') return;
  input.target = canvasPoint(event);
  sfx.click();
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (game.state === 'playing' && game.world.coins > 0) {
    input.toss = canvasPoint(event);
    sfx.coin();
  }
});

// ---- the loop ----
let last = performance.now();
let prevAlarmHigh = false;
let prevTaken = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing') {
    const world = game.world;
    const toss = input.toss;
    input.toss = null;
    stepWorld(world, { ...input, toss }, dt);
    const taken = world.loot.filter((i) => i.taken).length;
    if (taken > prevTaken) sfx.pickup();
    prevTaken = taken;
    if (world.alarm >= 0.6 && !prevAlarmHigh) sfx.spotted();
    prevAlarmHigh = world.alarm >= 0.6;
    if (world.events.includes('laser')) sfx.laser();
    if (world.events.includes('vault')) sfx.vault();
    if (world.caught) {
      game.state = 'caught';
      sfx.caught();
    } else if (world.won) {
      game.state = 'win';
      sfx.win();
    }
  }
  draw(ctx, game, now);
  requestAnimationFrame(frame);
}

// ---- deterministic shot staging (?shot=start|play|end&seed=N) ----
function stageShot(kind) {
  const rand = rngFrom(seed * 7919 + 13);
  void rand;
  if (kind === 'start') {
    game.state = 'title';
    game.world = buildWorld();
    // A few seconds of patrol so the cones sit mid-room.
    for (let i = 0; i < 300; i++) stepWorld(game.world, {}, 1 / 60);
    game.world.time = 0;
  } else if (kind === 'play') {
    // Mid-heist: two pieces of loot already lifted, the thief sneaking
    // toward the vault while a guard's cone sweeps across the hall.
    game.world = buildWorld();
    game.state = 'playing';
    game.world.loot[0].taken = true;
    game.world.loot[2].taken = true;
    game.world.score = 450;
    game.world.player.x = 560;
    game.world.player.y = 320;
    game.world.player.sneaking = true;
    game.world.player.face = -Math.PI / 2;
    game.world.vaultProgress = 0.55;
    game.world.alarm = 0.38;
    game.world.time = 47;
    for (let i = 0; i < 180; i++) stepWorld(game.world, {}, 1 / 60);
    game.world.time = 47;
  } else if (kind === 'end') {
    // Clean getaway: vault cracked, every piece of loot lifted, the thief
    // at the van.
    game.world = buildWorld();
    for (const item of game.world.loot) item.taken = true;
    game.world.vaultOpen = true;
    game.world.vaultProgress = 1;
    game.world.player.x = 640;
    game.world.player.y = 660;
    game.world.score = 1750;
    game.world.time = 132;
    game.world.won = true;
    game.state = 'win';
  }
  draw(ctx, game, performance.now());
  document.title = `OK shot=${kind} state=${game.state}`;
}

const shot = params.get('shot');
if (shot) {
  // Full-bleed frame for screenshots: the canvas is exactly 1280x720,
  // the same as the capture window, so the render fills the shot.
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  document.body.style.overflow = 'hidden';
  const mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.style.padding = '0';
    mainEl.style.gap = '0';
  }
  const help = document.getElementById('help');
  if (help) help.style.display = 'none';
  stageShot(shot);
} else {
  draw(ctx, game, performance.now());
  document.title = 'OK The Midnight Vault';
}
requestAnimationFrame(frame);

// ---- headless self-test (?selftest=1): drive the simulation, report ----
if (params.get('selftest') === '1') {
  const results = [];
  const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  try {
    const w = buildWorld();
    check('world has loot', w.loot.length === 5);
    check('world has guards', w.guards.length === 3);
    check('world has cameras', w.cameras.length === 2);
    check('world has lasers', w.lasers.length === 3);
    // Walk right for 3s: the player must actually move.
    const x0 = w.player.x;
    for (let i = 0; i < 180; i++) stepWorld(w, { right: true }, 1 / 60);
    check('player moves', w.player.x > x0 + 50);
    // Stand in front of guard 0 until the alarm maxes out.
    const fresh = buildWorld();
    const g = fresh.guards[0];
    fresh.player.x = g.x + Math.cos(g.angle) * 100;
    fresh.player.y = g.y + Math.sin(g.angle) * 100;
    let spotted = false;
    for (let i = 0; i < 60 * 6 && !spotted; i++) {
      stepWorld(fresh, {}, 1 / 60);
      if (fresh.alarm > 0.9) spotted = true;
    }
    check('guard spots player', spotted);
    // Collect the two gold bars and the cash by teleporting, then crack
    // the vault and take its gold.
    const w2 = buildWorld();
    for (const item of w2.loot) {
      if (item.kind === 'vaultGold') continue;
      w2.player.x = item.x;
      w2.player.y = item.y;
      stepWorld(w2, {}, 1 / 60);
    }
    check('floor loot collectable', w2.loot.filter((i) => i.kind !== 'vaultGold').every((i) => i.taken));
    w2.player.x = 640;
    w2.player.y = 140;
    for (let i = 0; i < 60 * 5; i++) stepWorld(w2, { crack: true }, 1 / 60);
    check('vault cracks open', w2.vaultOpen === true);
    w2.player.x = 640;
    w2.player.y = 80;
    stepWorld(w2, {}, 1 / 60);
    check('vault gold collectable', w2.loot.find((i) => i.kind === 'vaultGold').taken === true);
    // Walk into an active laser: the alarm must jump.
    const w3 = buildWorld();
    const laser = w3.lasers[0];
    w3.player.x = (laser.x1 + laser.x2) / 2;
    w3.player.y = laser.y1;
    // Force the beam on by setting time so it is active.
    w3.time = -laser.offset + 0.1;
    stepWorld(w3, {}, 1 / 60);
    check('laser raises alarm', w3.alarm > 0.2);
    // Escape with everything: the win fires.
    w2.player.x = 640;
    w2.player.y = 660;
    stepWorld(w2, {}, 1 / 60);
    check('escape wins the game', w2.won === true);
    const failed = results.filter((r) => r.startsWith('FAIL')).length;
    const node = document.createElement('pre');
    node.id = 'selftest';
    node.textContent = results.join('\n');
    document.body.appendChild(node);
    document.title = failed === 0 ? 'SELFTEST PASS' : `SELFTEST FAIL ${failed}`;
  } catch (err) {
    document.title = `SELFTEST ERROR ${err.message}`;
  }
}
