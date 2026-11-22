// A tiny seeded RNG (mulberry32) so a screenshot staged from a seed is the
// same every run, whatever the machine.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a seeded RNG. */
export function rngInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one entry of `list` from a seeded RNG. */
export function rngPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
