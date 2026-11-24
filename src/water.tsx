import { staticFile } from 'raea';
import { Mesh3d, Plane3d } from 'raea/mesh';
import { Material, StandardMaterial } from '@raea/render/bevy3d';
import { Transform } from 'raea/transform';
import { evening, FPS, type State } from './game';

export function Water({ s }: { s: State }) {
  const floating = ['wait', 'bite', 'reel'].includes(s.phase);
  const t = s.frame / FPS;
  const trail = (lag: number) => {
    const point = s.trails[s.trails.length - 1 - lag];
    return point ? [point[0], point[1], (s.frame - point[2]) / FPS, point[4]] : [0, 0, 0, 0];
  };
  return (
    <>
      <Mesh3d
        name="refracting-water"
        transform={Transform.fromXyz(0, -0.012, 0)}
        castShadow={false}
        receiveShadow={false}
        allowOverlap
      >
        <Plane3d half_size={[26, 26]} />
        <StandardMaterial
          base_color="#e1f7ee"
          specular_transmission={1}
          ior={1.33}
          thickness={0.35}
          perceptual_roughness={0.075}
          reflectance={0.19}
          normal_map_texture={staticFile('wave-normal.png')}
          uv_transform={{ scale: [12, 12], angle: 0, translation: [t * 0.013, t * 0.007] }}
        />
      </Mesh3d>
      <Mesh3d name="lagoon-surface" castShadow={false} receiveShadow={false} allowOverlap>
        <Plane3d half_size={[26, 26]} />
        <Material
          fragment={staticFile('lagoon.wesl')}
          alpha_mode="Blend"
          uniforms={{
            water_clock: [s.frame / FPS, evening(s.frame), 0, 0],
            boat_pose: [s.x, s.z, s.heading, Math.min(1, Math.hypot(s.vx, s.vz) * 18)],
            float_pose: [s.castX, s.castZ, floating ? 1 : 0, 0],
            ripple_a: trail(2),
            ripple_b: trail(5),
            ripple_c: trail(8),
          }}
        />
      </Mesh3d>
    </>
  );
}
