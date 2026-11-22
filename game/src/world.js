// The Midnight Vault — the simulation: one bank floor after dark.
// The thief must lift every piece of loot, crack the vault, and reach the
// getaway van. Guards patrol with vision cones, cameras sweep theirs, and a
// blinking laser grid guards the right side of the hall. The alarm meter
// rises while anyone has eyes on the thief; at 100% the night is over.

import { ALARM, CAMERA, FIELD, GUARD, LOOT_VALUES, PLAYER, VAULT } from './config.js';

const WALL = 40;

/** Rects the thief and the guards cannot walk through (outer walls + desks). */
export function solidRects(state) {
  const rects = [
    { x: 0, y: 0, w: FIELD.width, h: WALL },
    { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL },
    { x: 0, y: 0, w: WALL, h: FIELD.height },
    { x: FIELD.width - WALL, y: 0, w: WALL, h: FIELD.height },
    ...state.desks,
  ];
  if (!state.vaultOpen) rects.push(state.vaultBlock);
  return rects;
}

/** Rects that block a line of sight (walls, desks, the closed vault). */
function losBlockers(state) {
  return solidRects(state);
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

function moveCircle(pos, dx, dy, radius, rects) {
  let x = pos.x + dx;
  let y = pos.y;
  for (const r of rects) {
    if (circleHitsRect(x, y, radius, r)) { x = pos.x; break; }
  }
  let ny = pos.y + dy;
  for (const r of rects) {
    if (circleHitsRect(x, ny, radius, r)) { ny = pos.y; break; }
  }
  return { x, y: ny };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when a watcher at (wx,wy) facing `angle` can see (px,py). */
export function canSee(wx, wy, angle, range, halfAngle, px, py, blockers) {
  const dx = px - wx;
  const dy = py - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  const steps = Math.ceil(dist / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = wx + dx * t;
    const sy = wy + dy * t;
    for (const r of blockers) {
      if (pointInRect(sx, sy, r)) return false;
    }
  }
  return true;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}

export function buildWorld() {
  return {
    time: 0,
    score: 0,
    alarm: 0,
    coins: 5,
    vaultProgress: 0,
    vaultOpen: false,
    caught: false,
    caughtReason: '',
    won: false,
    events: [],
    player: { x: 640, y: 600, face: -Math.PI / 2, sneaking: false, moving: false },
    desks: [
      { x: 180, y: 280, w: 180, h: 50 },
      { x: 500, y: 280, w: 180, h: 50 },
      { x: 820, y: 280, w: 180, h: 50 },
      { x: 340, y: 460, w: 180, h: 50 },
      { x: 660, y: 460, w: 180, h: 50 },
    ],
    vaultBlock: { x: 540, y: 40, w: 200, h: 80 },
    vaultDoor: { x: 640, y: 120 },
    exit: { x: 600, y: 640, w: 80, h: 40 },
    loot: [
      { x: 300, y: 180, kind: 'gold', taken: false, value: LOOT_VALUES.gold },
      { x: 980, y: 180, kind: 'gold', taken: false, value: LOOT_VALUES.gold },
      { x: 180, y: 580, kind: 'cash', taken: false, value: LOOT_VALUES.cash },
      { x: 1120, y: 580, kind: 'cash', taken: false, value: LOOT_VALUES.cash },
      { x: 640, y: 80, kind: 'vaultGold', taken: false, value: LOOT_VALUES.vaultGold },
    ],
    guards: [
      { x: 200, y: 200, angle: 0, wp: 0, state: 'patrol', wait: 0, loseSight: 0,
        path: [[200, 200], [600, 200], [600, 520], [200, 520]] },
      { x: 1080, y: 200, angle: Math.PI, wp: 0, state: 'patrol', wait: 0, loseSight: 0,
        path: [[1080, 200], [1080, 520], [760, 520], [760, 200]] },
      { x: 380, y: 150, angle: 0, wp: 0, state: 'patrol', wait: 0, loseSight: 0,
        path: [[380, 150], [900, 150]] },
    ],
    cameras: [
      { x: 70, y: 70, base: 0.6, angle: 0.6, phase: 0 },
      { x: 1210, y: 70, base: Math.PI - 0.6, angle: Math.PI - 0.6, phase: 1.7 },
    ],
    lasers: [
      { x1: 1000, y1: 250, x2: 1240, y2: 250, period: 2.4, offset: 0, cooldown: 0 },
      { x1: 1000, y1: 360, x2: 1240, y2: 360, period: 2.4, offset: 0.8, cooldown: 0 },
      { x1: 1000, y1: 470, x2: 1240, y2: 470, period: 2.4, offset: 1.6, cooldown: 0 },
    ],
  };
}

export function laserActive(laser, time) {
  return ((time + laser.offset) % laser.period) < laser.period * 0.55;
}

/** One fixed simulation step. `input`: {left,right,up,down,sneak,crack,target,toss}. */
export function stepWorld(s, input, dt) {
  s.events.length = 0;
  s.time += dt;
  const p = s.player;
  const rects = solidRects(s);

  // ---- the thief moves ----
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx === 0 && my === 0 && input.target) {
    const dx = input.target.x - p.x;
    const dy = input.target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 6) { mx = dx / d; my = dy / d; }
  }
  const len = Math.hypot(mx, my);
  p.sneaking = !!input.sneak;
  p.moving = len > 0;
  if (len > 0) {
    const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    p.face = Math.atan2(my / len, mx / len);
    const next = moveCircle(p, (mx / len) * speed * dt, (my / len) * speed * dt, PLAYER.radius, rects);
    p.x = next.x;
    p.y = next.y;
  }

  // ---- coin toss: nearest guard inside 420px goes to investigate ----
  if (input.toss && s.coins > 0) {
    s.coins -= 1;
    let best = null;
    let bestD = 420;
    for (const g of s.guards) {
      const d = Math.hypot(g.x - input.toss.x, g.y - input.toss.y);
      if (d < bestD) { bestD = d; best = g; }
    }
    if (best) {
      best.state = 'distracted';
      best.distractX = input.toss.x;
      best.distractY = input.toss.y;
      best.wait = 2.5;
    }
    s.events.push('coin');
  }

  // ---- loot ----
  for (const item of s.loot) {
    if (item.taken) continue;
    if (item.kind === 'vaultGold' && !s.vaultOpen) continue;
    if (Math.hypot(p.x - item.x, p.y - item.y) < 28) {
      item.taken = true;
      s.score += item.value;
      s.events.push('pickup');
    }
  }

  // ---- crack the vault: hold E close to the door ----
  const vaultDist = Math.hypot(p.x - s.vaultDoor.x, p.y - s.vaultDoor.y);
  if (input.crack && vaultDist < VAULT.crackDistance && !s.vaultOpen) {
    s.vaultProgress += dt / VAULT.crackSeconds;
    if (s.vaultProgress >= 1) {
      s.vaultProgress = 1;
      s.vaultOpen = true;
      s.events.push('vault');
    }
  }

  // ---- lasers ----
  for (const laser of s.lasers) {
    laser.cooldown = Math.max(0, laser.cooldown - dt);
    if (!laserActive(laser, s.time) || laser.cooldown > 0) continue;
    if (distToSegment(p.x, p.y, laser.x1, laser.y1, laser.x2, laser.y2) < 14) {
      s.alarm = Math.min(1, s.alarm + ALARM.laserHit);
      laser.cooldown = 0.6;
      s.events.push('laser');
    }
  }

  // ---- watchers: guards and cameras ----
  const blockers = losBlockers(s);
  const sneakFactor = p.sneaking ? PLAYER.sneakAlarmFactor : 1;
  let seen = false;
  const alarmBefore = s.alarm;

  for (const g of s.guards) {
    const sees = canSee(g.x, g.y, g.angle, GUARD.sightRange, GUARD.sightHalfAngle, p.x, p.y, blockers);
    if (g.state === 'distracted') {
      const dx = g.distractX - g.x;
      const dy = g.distractY - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const nx = moveCircle(g, (dx / d) * GUARD.patrolSpeed * dt, (dy / d) * GUARD.patrolSpeed * dt, GUARD.radius, rects);
        g.x = nx.x; g.y = nx.y;
        g.angle = Math.atan2(dy, dx);
      } else {
        g.wait -= dt;
        if (g.wait <= 0) g.state = 'patrol';
      }
    } else if (sees && s.alarm >= GUARD.chaseAlarm) {
      g.state = 'chase';
      g.loseSight = 0;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const nx = moveCircle(g, (dx / d) * GUARD.chaseSpeed * dt, (dy / d) * GUARD.chaseSpeed * dt, GUARD.radius, rects);
        g.x = nx.x; g.y = nx.y;
        g.angle = Math.atan2(dy, dx);
      }
    } else {
      if (g.state === 'chase') {
        g.loseSight += dt;
        if (g.loseSight > 3) g.state = 'patrol';
      } else {
        g.state = 'patrol';
      }
      const target = g.path[g.wp];
      const dx = target[0] - g.x;
      const dy = target[1] - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        g.wp = (g.wp + 1) % g.path.length;
      } else {
        const nx = moveCircle(g, (dx / d) * GUARD.patrolSpeed * dt, (dy / d) * GUARD.patrolSpeed * dt, GUARD.radius, rects);
        g.x = nx.x; g.y = nx.y;
        g.angle = Math.atan2(dy, dx);
      }
    }
    if (sees) {
      seen = true;
      const dist = Math.hypot(p.x - g.x, p.y - g.y);
      const rate = (dist < GUARD.sightRange / 2 ? ALARM.riseClose : ALARM.riseFar) * sneakFactor;
      s.alarm = Math.min(1, s.alarm + rate * dt);
    }
    if (Math.hypot(p.x - g.x, p.y - g.y) < GUARD.catchDistance) {
      s.caught = true;
      s.caughtReason = 'A guard grabbed you.';
    }
  }

  for (const c of s.cameras) {
    c.angle = c.base + Math.sin(s.time * CAMERA.sweepSpeed + c.phase) * 0.5;
    if (canSee(c.x, c.y, c.angle, CAMERA.sightRange, CAMERA.sightHalfAngle, p.x, p.y, blockers)) {
      seen = true;
      const dist = Math.hypot(p.x - c.x, p.y - c.y);
      const rate = (dist < CAMERA.sightRange / 2 ? ALARM.riseClose : ALARM.riseFar) * sneakFactor * 0.8;
      s.alarm = Math.min(1, s.alarm + rate * dt);
    }
  }

  if (!seen) s.alarm = Math.max(0, s.alarm - ALARM.decay * dt);
  if (!s.caught && alarmBefore < 0.6 && s.alarm >= 0.6) s.events.push('spotted');
  if (s.alarm >= 1) {
    s.caught = true;
    s.caughtReason = 'The alarm hit 100% — the bank is in lockdown.';
  }

  // ---- escape: all loot, vault cracked, reach the van ----
  const allLoot = s.loot.every((item) => item.taken);
  if (!s.won && allLoot && s.vaultOpen && pointInRect(p.x, p.y, s.exit)) {
    s.won = true;
    s.score += Math.max(0, 300 - Math.floor(s.time) * 2);
    s.events.push('win');
  }
}
