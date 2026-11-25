import { staticFile } from 'raea';
import { Mesh3d, Plane3d } from 'raea/mesh';
import { Material } from '@raea/render/bevy3d';
import { clamp, evening, FPS, smooth, type State } from './game';
import type { V } from './motion';

export function Water({
  s,
  otter,
  bow,
  floatPos,
  fishTrail,
  splashOrigin,
}: {
  s: State;
  otter: [number, number, number];
  bow: V;
  floatPos: V;
  fishTrail: V;
  splashOrigin: [number, number];
}) {
  const floating = ['wait', 'bite', 'reel'].includes(s.phase);
  const biting = s.phase === 'bite' ? 1 : s.phase === 'reel' ? 0.85 : 0;
  const age = s.frame - s.since;
  const splashT =
    s.phase === 'lift' && age < 18
      ? clamp(age / 18, 0.01, 1)
      : (s.phase === 'wait' || s.phase === 'reel') && age < 14
        ? clamp(age / 14, 0.01, 1)
        : 0;
  const sun = evening(s.frame);
  const lanternOn = smooth((sun - 0.18) / 0.38);

  const trail = (lag: number) => {
    const point = s.trails[s.trails.length - 1 - lag];
    return point ? [point[0], point[1], (s.frame - point[2]) / FPS, point[4]] : [0, 0, 0, 0];
  };

  // During lift, anchor float_pose at the exact water breakout point so the splash ring explodes right under the leaping fish!
  const fx = s.phase === 'lift' ? splashOrigin[0] : floatPos[0];
  const fz = s.phase === 'lift' ? splashOrigin[1] : floatPos[2];

  // During reel, repurpose ripple_c to paint crisp curved white wake arcs trailing behind the darting fish!
  const rippleC =
    s.phase === 'reel' ? [fishTrail[0], fishTrail[2], 0.28, 0.08] : trail(8);

  return (
    <Mesh3d name="lagoon-surface" castShadow={false} receiveShadow={false} allowOverlap>
      <Plane3d half_size={[28, 28]} />
      <Material
        fragment={staticFile('lagoon.wesl')}
        alpha_mode="Blend"
        uniforms={{
          water_clock: [s.frame / FPS, sun, splashT, 0],
          boat_pose: [s.x, s.z, s.heading, Math.min(1, Math.hypot(s.vx, s.vz) * 18)],
          float_pose: [fx, fz, floating ? 1 : 0, biting],
          ripple_a: trail(2),
          ripple_b: trail(5),
          ripple_c: rippleC,
          otter_pose: [otter[0], otter[1], otter[2], 1],
          lantern_pose: [bow[0], bow[2], lanternOn, 0],
        }}
      />
    </Mesh3d>
  );
}
