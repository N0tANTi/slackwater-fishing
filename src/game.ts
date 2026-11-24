export const FPS = 30;
export const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const smooth = (n: number) => {
  const t = clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
export type Phase = 'row' | 'aim' | 'cast' | 'wait' | 'bite' | 'reel' | 'lift' | 'catch' | 'miss';
export type Species = 'perch' | 'carp';
export const species = {
  perch: { name: 'Reed Perch', note: 'waits under the weed', color: '#9eb750' },
  carp: { name: 'Lantern Carp', note: 'rises when the light goes gold', color: '#eab34d' },
};
export interface State {
  frame: number;
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  phase: Phase;
  since: number;
  castNo: number;
  castX: number;
  castZ: number;
  target: Species;
  size: number;
  perch: number;
  carp: number;
  reel: number;
  slack: number;
  used: boolean;
  lastAction: boolean;
  lastHelp: boolean;
  help: boolean;
  wait: number;
  miss: string;
  sound: string;
  soundAt: number;
  trails: number[][];
}
export const initial: State = {
  frame: 0,
  x: 0,
  z: 0,
  heading: 0.4,
  vx: 0,
  vz: 0,
  phase: 'row',
  since: 0,
  castNo: 0,
  castX: 0,
  castZ: 0,
  target: 'perch',
  size: 47,
  perch: 0,
  carp: 0,
  reel: 0,
  slack: 0,
  used: false,
  lastAction: false,
  lastHelp: false,
  help: false,
  wait: 0,
  miss: '',
  sound: '',
  soundAt: -100,
  trails: [],
};
type Input = { keys: string[]; pointer?: { down?: boolean }; buttons?: string[] };
const change = (s: State, phase: Phase, sound = '') => {
  s.phase = phase;
  s.since = s.frame;
  if (sound) {
    s.sound = sound;
    s.soundAt = s.frame;
  }
};
export function evening(frame: number) {
  const t = (frame / FPS) % 76;
  return smooth((t - 9) / 8) * (1 - smooth((t - 45) / 24));
}
export function step(old: State, input: Input, frame: number): State {
  const keys = input.keys.map((k) => k.toLowerCase());
  const has = (...choices: string[]) => choices.some((k) => keys.includes(k));
  const action = has(' ', 'space', 'spacebar') || !!input.pointer?.down || !!input.buttons?.includes('Left');
  const help = has('h', 'keyh', '?');
  const pressed = action && !old.lastAction,
    released = !action && old.lastAction;
  const s: State = { ...old, frame, lastAction: action, lastHelp: help };
  if (help && !old.lastHelp) s.help = !s.help;
  const age = frame - s.since;
  const drive = Number(has('arrowup', 'w', 'keyw')) - Number(has('arrowdown', 's', 'keys'));
  const steer = Number(has('arrowleft', 'a', 'keya')) - Number(has('arrowright', 'd', 'keyd'));
  s.used ||= !!(drive || steer || action);
  if (s.phase === 'row' || s.phase === 'aim') s.heading += steer * 0.049;
  const thrust = s.phase === 'row' ? drive * 0.006 : 0;
  s.vx = old.vx * 0.925 + Math.cos(s.heading) * thrust;
  s.vz = old.vz * 0.925 - Math.sin(s.heading) * thrust;
  s.x = clamp(s.x + s.vx, -12, 12);
  s.z = clamp(s.z + s.vz, -12, 12);
  if (frame % 7 === 0)
    s.trails = [
      ...old.trails.filter((p) => frame - p[2] < 88),
      [s.x, s.z, frame, s.heading, Math.hypot(s.vx, s.vz)],
    ];
  const cancel = has('escape', 'backspace', 'x', 'keyx');
  if (cancel && !['row', 'lift', 'catch', 'miss'].includes(s.phase)) {
    s.miss = 'Line retrieved';
    change(s, 'miss');
    return s;
  }
  switch (s.phase) {
    case 'row':
      if (pressed) change(s, 'aim');
      break;
    case 'aim':
      if (released || age >= 43) {
        const distance = 2.15 + 1.75 * clamp(age / 36, 0, 1),
          angle = s.heading - 1.06;
        s.castX = s.x + distance * Math.cos(angle);
        s.castZ = s.z - distance * Math.sin(angle);
        s.castNo++;
        s.reel = 0;
        s.slack = 0;
        s.target = evening(frame) > 0.47 ? 'carp' : 'perch';
        s.size =
          s.castNo === 1 && s.target === 'perch'
            ? 47
            : s.target === 'carp'
              ? 72 + ((s.castNo * 4) % 16)
              : 32 + ((s.castNo * 13) % 24);
        s.wait = 74 + ((s.castNo * 17) % 36);
        change(s, 'cast', 'cast');
      }
      break;
    case 'cast':
      if (age >= 20) change(s, 'wait', 'plop');
      break;
    case 'wait':
      if (pressed) {
        s.miss = 'Too early';
        change(s, 'miss');
      } else if (age >= s.wait) change(s, 'bite', 'plop');
      break;
    case 'bite':
      if (pressed) change(s, 'reel', 'strike');
      else if (age >= 34) {
        s.miss = 'The fish slipped away';
        change(s, 'miss');
      }
      break;
    case 'reel':
      s.reel = clamp(s.reel + (action ? 0.043 : -0.008), 0, 1);
      s.slack = action ? Math.max(0, s.slack - 2) : s.slack + 1;
      if (s.reel >= 1) change(s, 'lift');
      else if (s.slack > 32) {
        s.miss = 'The line went slack';
        change(s, 'miss');
      }
      break;
    case 'lift':
      if (age >= 21) {
        s[s.target]++;
        change(s, 'catch', 'land');
      }
      break;
    case 'catch':
      if (age >= 95 || (pressed && age > 15)) change(s, 'row');
      break;
    case 'miss':
      if (age >= 32 || (pressed && age > 8)) change(s, 'row');
      break;
  }
  return s;
}
export const demoKeys: Record<number, string[]> = {
  0: [],
  4: ['ArrowUp'],
  28: [' '],
  70: [],
  203: [' '],
  235: [],
  344: ['ArrowUp', 'ArrowLeft'],
  353: ['ArrowUp'],
  395: [],
  404: [' '],
  434: [],
  576: [' '],
  607: [],
  682: [' '],
  684: [],
};
export function demoStep(s: State, _input: Input, frame: number): State {
  let keys: string[] = [];
  for (const at of Object.keys(demoKeys).map(Number)) {
    if (at > frame) break;
    keys = demoKeys[at];
  }
  return step(s, { keys }, frame);
}
