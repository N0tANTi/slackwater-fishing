import { staticFile } from 'raea';
import { Model, Sphere } from 'raea/3d';
import { Camera3d } from 'raea/camera';
import { AmbientLight, DirectionalLight, PointLight } from 'raea/light';
import { Cylinder, Mesh3d, Torus } from 'raea/mesh';
import { StandardMaterial } from 'raea/pbr';
import { Transform, Quat } from 'raea/transform';
import { Water } from './water';
import { clamp, evening, FPS, smooth, type State } from './game';

type V = [number, number, number];
const wave = Math.sin;
function bodyPoint(s: State, x: number, y: number, z: number): V {
  const c = Math.cos(s.heading),
    h = Math.sin(s.heading);
  return [s.x + c * x + h * z, y, s.z - h * x + c * z];
}
function Asset({
  id,
  file = id,
  at = [0, 0, 0],
  rot = [0, 0, 0],
  size = 1,
}: {
  id: string;
  file?: string;
  at?: V;
  rot?: V;
  size?: number | V;
}) {
  const swimming = ['perch', 'carp', 'minnow', 'ray'].includes(file) && id !== 'landed-fish';
  return (
    <Model
      name={id}
      src={staticFile(file + '.glb')}
      position={at}
      rotation={rot}
      scale={size}
      animation={swimming ? 0 : undefined}
      allowOverlap={id === 'lagoon' || id === 'bed'}
    />
  );
}
function Bead({ id, at, scale, color }: { id: string; at: V; scale: V; color: string }) {
  return (
    <Mesh3d
      name={id}
      allowOverlap={id.startsWith('cork') || id === 'lantern'}
      transform={Transform.fromXyz(...at).withScale(scale)}
    >
      <Sphere radius={1} />
      <StandardMaterial base_color={color} perceptual_roughness={0.65} />
    </Mesh3d>
  );
}
function Stick({ id, a, b, r, color }: { id: string; a: V; b: V; r: number; color: string }) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    len = Math.max(0.001, Math.hypot(dx, dy, dz));
  // Local Y is the cylinder's long axis.
  const rot = Quat.fromEuler('YXZ', Math.atan2(dx, dz), Math.acos(clamp(dy / len, -1, 1)), 0);
  return (
    <Mesh3d
      name={id}
      transform={Transform.fromXyz((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2).withRotation(rot)}
    >
      <Cylinder radius={r} half_height={len / 2} />
      <StandardMaterial base_color={color} />
    </Mesh3d>
  );
}
function Ring({
  id,
  at,
  r,
  color,
  tube = 0.012,
}: {
  id: string;
  at: V;
  r: number;
  color: string;
  tube?: number;
}) {
  return (
    <Mesh3d name={id} transform={Transform.fromXyz(...at)}>
      <Torus major_radius={Math.max(0.022, r)} minor_radius={tube} />
      <StandardMaterial base_color={color} perceptual_roughness={0.65} />
    </Mesh3d>
  );
}
function Shoal({ s }: { s: State }) {
  const t = s.frame / FPS;
  return (
    <>
      {Array.from({ length: 27 }, (_, i) => {
        const group = Math.floor(i / 4),
          member = i % 4;
        const phase = t * (0.22 + 0.012 * group) + group * 1.91 + member * 0.18;
        const baseX = Math.sin(group * 17.43 + 2.2) * 5.1,
          baseZ = Math.sin(group * 8.19 + 0.2) * 3.6;
        const cx = baseX + 16 * Math.round((s.x - baseX) / 16),
          cz = baseZ + 14 * Math.round((s.z - baseZ) / 14);
        const x = cx + Math.sin(phase) * (1.5 + group * 0.09) + member * 0.17;
        const z = cz + Math.cos(phase) * 0.7 + Math.sin(phase * 2 + member) * 0.17 + member * 0.2;
        const yaw =
          Math.atan2(0.7 * Math.sin(phase), (1.5 + group * 0.09) * Math.cos(phase)) +
          0.095 * wave(t * 7 + i * 3);
        const file = i % 7 === 0 ? 'carp' : i % 5 === 0 ? 'perch' : 'minnow';
        return (
          <Asset
            key={i}
            id={'shoal-' + i}
            file={file}
            at={[x, -0.33 + 0.07 * wave(i + t * 2.1), z]}
            rot={[0, yaw, 0]}
            size={0.46 + 0.12 * (i % 4)}
          />
        );
      })}
      <Asset
        id="spotted-ray"
        file="ray"
        at={[2.4 * Math.cos(0.17 * t + 0.4), -0.65, 1.9 * Math.sin(0.17 * t + 0.4)]}
        rot={[
          0.09 * wave(t * 2.2),
          Math.atan2(-1.9 * Math.cos(0.17 * t + 0.4), -2.4 * Math.sin(0.17 * t + 0.4)),
          0.035 * wave(t),
        ]}
        size={1.35}
      />
    </>
  );
}
export function World({ s }: { s: State }) {
  const t = s.frame / FPS,
    age = s.frame - s.since,
    hold = s.phase === 'catch';
  const zoom = hold ? smooth(age / 15) * (1 - smooth((age - 75) / 20)) : 0;
  const aimX = s.x - 1.18 * zoom,
    aimZ = s.z + 0.05,
    sun = evening(s.frame);
  const bob = 0.028 * wave(t * 2.4) + 0.012 * wave(t * 3.7);
  const roll = 0.017 * wave(t * 2.15),
    speed = Math.min(1, Math.hypot(s.vx, s.vz) / 0.065);
  const pose = hold ? 'hold' : ['cast', 'aim', 'reel', 'lift'].includes(s.phase) ? 'cast' : 'rest';
  const fisherYaw = hold
    ? s.heading + Math.atan2(-Math.sin(s.heading), Math.cos(s.heading)) * smooth(age / 13)
    : s.heading;
  const hand = bodyPoint(s, 0.13, 0.71 + bob, 0.24);
  const lift =
    s.phase === 'aim'
      ? smooth(age / 32)
      : s.phase === 'cast'
        ? 1 - smooth(age / 13)
        : s.phase === 'reel'
          ? 0.66
          : hold
            ? 0.8
            : 0;
  const tip = bodyPoint(s, 0.62 - 0.58 * lift, 1.27 + bob + 0.77 * lift, 0.99 - 0.43 * lift);
  const mid = bodyPoint(s, 0.44 - 0.3 * lift, 1.08 + bob + 0.43 * lift, 0.64 - 0.24 * lift);
  const flying = s.phase === 'cast' ? smooth(age / 20) : 1;
  const reeling = s.phase === 'reel' ? s.reel : 0;
  const float: V = [
    tip[0] + (s.castX - tip[0]) * flying,
    0.073 + 0.022 * wave(t * 4.8),
    tip[2] + (s.castZ - tip[2]) * flying,
  ];
  if (s.phase === 'cast') float[1] = tip[1] * (1 - flying) + 2.6 * flying * (1 - flying) + 0.07;
  if (s.phase === 'bite') float[1] = -0.015 + 0.078 * wave(age * 0.56);
  if (reeling) {
    float[0] += (hand[0] - float[0]) * reeling;
    float[2] += (hand[2] - float[2]) * reeling;
    float[1] += 0.6 * reeling;
  }
  const line = ['cast', 'wait', 'bite', 'reel'].includes(s.phase);
  const bow = bodyPoint(s, 1.48, 0.7 + bob, 0.0);
  const swimYaw = s.heading - 0.35 + 0.11 * wave(t * 1.3);
  const buddy = bodyPoint(
    s,
    -1.73 + 0.49 * wave(t * 0.51),
    0.017 + 0.02 * wave(t * 4),
    -1.7 + 0.35 * wave(t * 0.63),
  );
  const arc = 4 * reeling * (1 - reeling);
  if (reeling) float[1] += 0.58 * arc;
  const slackMid: V = [
    (tip[0] + float[0]) * 0.5,
    (tip[1] + float[1]) * 0.5 - 0.1 * (1 - reeling),
    (tip[2] + float[2]) * 0.5,
  ];
  const tint = (a: number[], b: number[]) =>
    '#' +
    a
      .map((v, i) =>
        Math.round(v + (b[i] - v) * sun * 0.72)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const splash = ['wait', 'reel'].includes(s.phase) && age < 14;
  return (
    <>
      <Camera3d
        transform={Transform.fromXyz(aimX, 9.05 - 4.9 * zoom, aimZ + 6.95 - 2.39 * zoom).lookingAt([
          aimX,
          0.06 + zoom * 0.18,
          aimZ,
        ])}
        projection={{ Perspective: { fov: 0.665, near: 0.1, far: 90 } }}
      />
      <AmbientLight color="#e5f3eb" brightness={410} />
      <DirectionalLight
        color="#e5f2ff"
        illuminance={2400 - sun * 1000}
        transform={Transform.fromXyz(2, 4, 7).lookingAt([0, 0, 0])}
      />
      <DirectionalLight
        color={tint([255, 244, 220], [255, 179, 92])}
        illuminance={12300 - sun * 2000}
        shadow_maps_enabled
        transform={Transform.fromXyz(-5, 9 - sun * 4, -5).lookingAt([0, 0, 0])}
      />
      <Asset id="bed" />
      <Asset id="lagoon" />
      <Shoal s={s} />
      <Water s={s} />
      <Asset id="otter" at={buddy} rot={[0.1 * wave(t * 3), swimYaw, 0.08 * wave(t * 2.7)]} size={0.83} />
      {sun > 0.3 && (
        <PointLight
          transform={Transform.fromXyz(...bow)}
          color="#ffbc54"
          intensity={2200 * sun}
          range={2.7}
        />
      )}

      <Asset id="skiff" at={[s.x, bob, s.z]} rot={[roll, s.heading, 0.009 * wave(t * 1.8)]} />
      <Asset
        id="angler"
        file={'fisher-' + pose}
        at={[s.x, bob, s.z]}
        rot={[
          roll + 0.045 * speed * wave(t * 5),
          fisherYaw,
          s.phase === 'cast'
            ? 0.09 * (1 - smooth(age / 20))
            : s.phase === 'reel'
              ? -0.07 * wave(age * 0.34)
              : 0,
        ]}
      />
      {[-1, 1].map((sign) => (
        <Asset
          key={sign}
          id={'oar-' + sign}
          file="oar"
          at={bodyPoint(s, -0.46, 0.31 + bob, sign * 0.59)}
          rot={[
            sign * (0.23 + 0.12 * speed * wave(t * 5)),
            s.heading + (sign < 0 ? Math.PI : 0) + sign * (0.91 + 0.53 * speed * wave(t * 5)),
            0,
          ]}
          size={1}
        />
      ))}
      {hold ? (
        <Stick
          id="stowed-rod"
          a={bodyPoint(s, -0.8, 0.34 + bob, 0.5)}
          b={bodyPoint(s, 1.45, 0.46 + bob, 0.36)}
          r={0.013}
          color="#af8650"
        />
      ) : (
        <>
          <Stick id="rod-butt" a={hand} b={mid} r={0.021} color="#805f38" />
          <Stick id="rod-tip" a={mid} b={tip} r={0.01} color="#bf985f" />
        </>
      )}
      {splash &&
        Array.from({ length: 8 }, (_, i) => {
          const u = age / 14,
            a = i * 2.4,
            radius = 0.04 + u * (0.18 + (i % 3) * 0.045),
            drop = 0.019 * (1 - u) + 0.005;
          return (
            <Bead
              key={i}
              id={'spray-' + i}
              at={[
                s.castX + radius * Math.cos(a),
                0.04 + u * (1 - u) * (0.76 + (i % 3) * 0.21),
                s.castZ + radius * Math.sin(a),
              ]}
              scale={[drop, drop * 1.55, drop]}
              color="#c0e5ce"
            />
          );
        })}
      {line && (
        <>
          <Stick id="leader-upper" a={tip} b={slackMid} r={0.007} color="#e9dcbc" />
          <Stick id="leader-lower" a={slackMid} b={float} r={0.007} color="#e9dcbc" />
          <Bead id="cork" at={float} scale={[0.065, 0.09, 0.065]} color="#ed4930" />
          <Bead
            id="cork-tip"
            at={[float[0], float[1] + 0.077, float[2]]}
            scale={[0.033, 0.044, 0.033]}
            color="#f4d186"
          />
        </>
      )}
      {s.phase === 'aim' && (
        <Ring
          id="cast-marker"
          at={bodyPoint(s, 1.35, 0.035, 2.03)}
          r={0.14 + clamp(age / 43, 0, 1) * 0.18}
          color="#fece73"
        />
      )}
      {(s.phase === 'bite' || s.phase === 'reel') && (
        <Ring
          id="strike-ring"
          at={[float[0], 0.05, float[2]]}
          r={s.phase === 'bite' ? 0.19 + 0.14 * (1 - (age % 16) / 16) : 0.16 + 0.12 * (1 - reeling)}
          color="#fff1b1"
          tube={0.018}
        />
      )}
      {['wait', 'bite', 'reel'].includes(s.phase) && (
        <Asset
          id="approaching-fish"
          file={s.target}
          at={[
            float[0] + 0.2 + (s.phase === 'wait' ? 1 - smooth(age / s.wait) : 0),
            float[1] - 0.18 + 0.15 * reeling,
            float[2] + 0.07 * wave(t * 5),
          ]}
          rot={[0, Math.PI + 0.13 * wave(t * 7), 0.45 * reeling * wave(t * 11)]}
          size={s.target === 'carp' ? 1.2 : 0.85}
        />
      )}
      {hold && (
        <Asset
          id="landed-fish"
          file={s.target}
          at={bodyPoint({ ...s, heading: fisherYaw }, -0.14, 0.87 + bob, 0.33)}
          rot={[0, fisherYaw + 0.04, 0.1 * wave(t * 5)]}
          size={s.target === 'carp' ? 1.1 : 0.82}
        />
      )}
      {s.phase === 'lift' && (
        <Asset
          id="lifting-fish"
          file={s.target}
          at={bodyPoint(
            s,
            0.28 - 0.42 * smooth(age / 21),
            0.73 + bob + 0.26 * wave((age * Math.PI) / 21),
            0.46 - 0.13 * smooth(age / 21),
          )}
          rot={[0, s.heading + 0.19 * wave(age * 0.5), 0.45 * (1 - age / 21)]}
          size={s.target === 'carp' ? 1.1 : 0.82}
        />
      )}
      {sun > 0.37 && <Bead id="lantern" at={bow} scale={[0.048, 0.057, 0.048]} color="#ffdf85" />}
    </>
  );
}
