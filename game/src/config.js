// Every tuning number and colour for The Midnight Vault, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 200,
  sneakSpeed: 110,
  /** Sneaking halves how fast the alarm rises while you are seen. */
  sneakAlarmFactor: 0.5,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 132,
  /** How far a guard can see, in pixels. */
  sightRange: 250,
  /** Half of a guard's vision cone, in radians. */
  sightHalfAngle: 0.61,
  /** Touch distance that catches the thief. */
  catchDistance: 28,
  /** Alarm above this makes the guard chase instead of patrol. */
  chaseAlarm: 0.45,
};

export const CAMERA = {
  sightRange: 280,
  sightHalfAngle: 0.44,
  sweepSpeed: 0.55,
};

export const ALARM = {
  /** Per second, seen at close range (under half the sight range). */
  riseClose: 0.85,
  /** Per second, seen at long range. */
  riseFar: 0.4,
  /** Per second, while nobody sees the thief. */
  decay: 0.22,
  /** One active laser crossing adds this much alarm at once. */
  laserHit: 0.3,
};

export const VAULT = {
  /** Seconds of holding E at the door to crack it. */
  crackSeconds: 4,
  /** How close the thief must stand to the vault door to crack it. */
  crackDistance: 90,
};

export const LOOT_VALUES = { gold: 300, cash: 150, vaultGold: 500 };

export const COLOURS = {
  floorA: '#20242f',
  floorB: '#252a38',
  wall: '#454b63',
  wallTop: '#5a6180',
  desk: '#7a5a2e',
  deskTop: '#96703a',
  vaultSteel: '#8a93a8',
  vaultDark: '#3c4152',
  gold: '#f2c14e',
  cash: '#5fbf6a',
  laser: '#ff3b30',
  guardCone: 'rgba(255, 220, 80, 0.16)',
  cameraCone: 'rgba(255, 80, 80, 0.14)',
  guard: '#2b3a67',
  thief: '#111318',
  thiefMask: '#d43d3d',
  van: '#2e7d32',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
