// The Midnight Vault — everything the player sees, drawn on one canvas.
// The frame always shows the whole room: the thief, the guards and their
// vision cones, the cameras, the loot, the vault and the alarm meter.

import { ALARM, CAMERA, COLOURS, FIELD, FONT, GUARD, PLAYER, VAULT } from './config.js';
import { laserActive } from './world.js';

const TILE = 40;

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawRect(ctx, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }
}

function drawFloor(ctx) {
  for (let cx = 0; cx < FIELD.width / TILE; cx++) {
    for (let cy = 0; cy < FIELD.height / TILE; cy++) {
      ctx.fillStyle = (cx + cy) % 2 === 0 ? COLOURS.floorA : COLOURS.floorB;
      ctx.fillRect(cx * TILE, cy * TILE, TILE, TILE);
    }
  }
  // Gold trim lines marking the teller hall.
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 140, 1040, 480);
}

function drawWalls(ctx, s) {
  ctx.fillStyle = COLOURS.wall;
  ctx.fillRect(0, 0, FIELD.width, TILE);
  // Bottom wall in two parts, leaving the exit gap where the van waits.
  ctx.fillRect(0, FIELD.height - TILE, 600, TILE);
  ctx.fillRect(680, FIELD.height - TILE, FIELD.width - 680, TILE);
  ctx.fillRect(0, 0, TILE, FIELD.height);
  ctx.fillRect(FIELD.width - TILE, 0, TILE, FIELD.height);
  ctx.fillStyle = COLOURS.wallTop;
  ctx.fillRect(0, TILE - 6, FIELD.width, 6);
  ctx.fillRect(0, FIELD.height - TILE, 600, 6);
  ctx.fillRect(680, FIELD.height - TILE, FIELD.width - 680, 6);
  ctx.fillRect(TILE - 6, 0, 6, FIELD.height);
  ctx.fillRect(FIELD.width - TILE, 0, 6, FIELD.height);
}

function drawDesks(ctx, s) {
  for (const d of s.desks) {
    drawRect(ctx, d, COLOURS.desk, COLOURS.deskTop);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(d.x + 14, d.y + 12, 26, 18);
    ctx.fillRect(d.x + d.w - 44, d.y + 20, 22, 14);
  }
}

function drawVault(ctx, s) {
  const b = s.vaultBlock;
  if (!s.vaultOpen) {
    drawRect(ctx, b, COLOURS.vaultSteel, '#c9d1e0');
    ctx.fillStyle = COLOURS.vaultDark;
    ctx.beginPath();
    ctx.arc(640, 80, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOURS.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(640, 80, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('VAULT', 640, 84);
    // Crack progress ring around the dial.
    if (s.vaultProgress > 0) {
      ctx.strokeStyle = COLOURS.gold;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(640, 80, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.vaultProgress);
      ctx.stroke();
    }
  } else {
    drawRect(ctx, b, '#171a24', COLOURS.gold);
    ctx.fillStyle = COLOURS.gold;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', 640, 84);
  }
}

function drawLoot(ctx, s) {
  for (const item of s.loot) {
    if (item.taken) continue;
    if (item.kind === 'vaultGold' && !s.vaultOpen) continue;
    if (item.kind === 'gold' || item.kind === 'vaultGold') {
      const r = item.kind === 'vaultGold' ? 16 : 11;
      ctx.fillStyle = COLOURS.gold;
      ctx.beginPath();
      ctx.arc(item.x, item.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d1f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(item.x - 4, item.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = COLOURS.cash;
      ctx.fillRect(item.x - 13, item.y - 8, 26, 16);
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x - 13, item.y - 8, 26, 16);
      ctx.fillStyle = '#e8f5e9';
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', item.x, item.y + 4);
    }
  }
}

function drawLasers(ctx, s) {
  for (const laser of s.lasers) {
    const active = laserActive(laser, s.time);
    ctx.save();
    if (active) {
      ctx.shadowColor = COLOURS.laser;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = COLOURS.laser;
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.25)';
      ctx.lineWidth = 2;
    }
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.restore();
    // Emitters on both ends.
    ctx.fillStyle = '#5a2020';
    ctx.fillRect(laser.x1 - 4, laser.y1 - 6, 8, 12);
    ctx.fillRect(laser.x2 - 4, laser.y2 - 6, 8, 12);
  }
}

function drawGuards(ctx, s) {
  for (const g of s.guards) {
    drawCone(ctx, g.x, g.y, g.angle, GUARD.sightRange, GUARD.sightHalfAngle, COLOURS.guardCone);
    ctx.fillStyle = COLOURS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfe6f5';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#dfe6f5';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 6), g.y + Math.sin(g.angle) * (GUARD.radius + 6));
    ctx.stroke();
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5252';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - GUARD.radius - 6);
    }
  }
}

function drawCameras(ctx, s) {
  for (const c of s.cameras) {
    drawCone(ctx, c.x, c.y, c.angle, CAMERA.sightRange, CAMERA.sightHalfAngle, COLOURS.cameraCone);
    ctx.fillStyle = '#8b93a3';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThief(ctx, s) {
  const p = s.player;
  ctx.fillStyle = COLOURS.thief;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Red mask band across the face.
  ctx.strokeStyle = COLOURS.thiefMask;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x - 8, p.y - 2);
  ctx.lineTo(p.x + 8, p.y - 2);
  ctx.stroke();
  // Sneak ring.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(232, 232, 232, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Vault-crack hint.
  const vaultDist = Math.hypot(p.x - s.vaultDoor.x, p.y - s.vaultDoor.y);
  if (!s.vaultOpen && vaultDist < VAULT.crackDistance) {
    ctx.fillStyle = '#fff3c4';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Hold E to crack the vault', p.x, p.y - 26);
  }
}

function drawVan(ctx, s) {
  ctx.fillStyle = COLOURS.van;
  ctx.fillRect(s.exit.x - 6, FIELD.height - 38, s.exit.w + 12, 38);
  ctx.fillStyle = '#e8f5e9';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN', 640, FIELD.height - 44);
}

function drawHud(ctx, s) {
  // Alarm meter, top left.
  const x = 56;
  const y = 56;
  const w = 220;
  const h = 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 8, y - 20, w + 16, h + 28);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', x, y - 6);
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);
  const frac = Math.max(0, Math.min(1, s.alarm));
  ctx.fillStyle = frac < 0.4 ? '#2fae5f' : frac < 0.7 ? '#f2c94c' : '#d64541';
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  const taken = s.loot.filter((i) => i.taken).length;
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`LOOT ${taken}/${s.loot.length}`, x, y + 34);
  ctx.fillText(`COINS ${s.coins}`, x + 110, y + 34);
  // Score and time, top right.
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${s.score}`, FIELD.width - 56, y - 6);
  ctx.fillText(`TIME ${Math.floor(s.time)}s`, FIELD.width - 56, y + 34);
  ctx.textAlign = 'left';
  // Vault progress, bottom left.
  if (!s.vaultOpen) {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(`VAULT ${Math.floor(s.vaultProgress * 100)}%`, 56, FIELD.height - 56);
  }
}

function drawPanel(ctx, title, lines, titleColour) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = titleColour;
  ctx.font = `bold 54px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 280);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `20px ${FONT}`;
  let y = 330;
  for (const line of lines) {
    ctx.fillText(line, FIELD.width / 2, y);
    y += 32;
  }
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_OVER = 'over';

export function draw(ctx, game) {
  const s = game.world;
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx);
  drawVault(ctx, s);
  drawDesks(ctx, s);
  drawLoot(ctx, s);
  drawLasers(ctx, s);
  drawGuards(ctx, s);
  drawCameras(ctx, s);
  drawThief(ctx, s);
  drawWalls(ctx, s);
  drawVan(ctx, s);
  drawHud(ctx, s);

  if (game.state === 'title') {
    drawPanel(ctx, 'THE MIDNIGHT VAULT', [
      'A bank heist after dark. Lift every piece of loot,',
      'crack the vault, and slip out to the getaway van —',
      'without the guards, the cameras or the lasers raising the alarm.',
      '',
      'WASD / arrows move · click to walk · Shift sneak · E crack the vault',
      'Space / right-click tosses a coin · P pause · M mute · R restart',
      '',
      'Press Enter or click to start',
    ], COLOURS.gold);
  } else if (game.state === 'paused') {
    drawPanel(ctx, 'PAUSED', ['Press P to keep going.'], '#e8e8e8');
  } else if (game.state === 'caught') {
    drawPanel(ctx, 'BUSTED!', [
      s.caughtReason,
      `Score ${s.score} · Loot ${s.loot.filter((i) => i.taken).length}/${s.loot.length}`,
      '',
      'Press R to try the night again',
    ], '#d64541');
  } else if (game.state === 'win') {
    drawPanel(ctx, 'CLEAN GETAWAY!', [
      `You cracked the vault and vanished with $${s.score.toLocaleString()}.`,
      `Finished in ${Math.floor(s.time)} seconds.`,
      '',
      'Press Enter to run it again',
    ], '#2fae5f');
  }
}
