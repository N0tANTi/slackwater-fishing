import { Fragment } from 'react';
import { staticFile } from 'raea';
import {
  AmbientOcclusion,
  Bloom,
  DepthOfField,
  Grade,
  Model,
  Shadows,
  Sphere,
  ToneMapping,
} from 'raea/3d';
import { Camera3d } from 'raea/camera';
import { LinearRgba, Srgba } from 'raea/color';
import { AmbientLight, DirectionalLight, PointLight } from 'raea/light';
import { Cylinder, Mesh3d, Torus } from 'raea/mesh';
import { StandardMaterial } from 'raea/pbr';
import { Quat, Transform } from 'raea/transform';
import { Water } from './water';
import { clamp, evening, FPS, smooth, type State } from './game';
import { bodyPoint, getCamera, getFishingKinematics, getUnifiedCharacterRig, quadBezier, type V } from './motion';

const wave = Math.sin;

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
  const swimming = ['perch', 'carp', 'koi', 'minnow', 'ray'].includes(file) && id !== 'landed-fish';
  return (
    <Model
      name={id}
      src={staticFile(file + '.glb')}
      position={at}
      rotation={rot}
      scale={size}
      animation={swimming ? 0 : undefined}
      allowOverlap={id === 'lagoon' || id === 'bed' || id.startsWith('oar-') || id === 'lifting-fish' || id === 'angler'}
    />
  );
}

function Bead({
  id,
  at,
  scale,
  color,
  emissiveMul = 0,
  roughness = 0.55,
  castShadow = true,
}: {
  id: string;
  at: V;
  scale: V;
  color: string;
  emissiveMul?: number;
  roughness?: number;
  castShadow?: boolean;
}) {
  return (
    <Mesh3d
      name={id}
      castShadow={castShadow}
      allowOverlap={
        id.startsWith('cork') ||
        id === 'lantern' ||
        id.startsWith('mote') ||
        id.startsWith('spray') ||
        id.startsWith('row-') ||
        id.startsWith('oar-spray')
      }
      transform={Transform.fromXyz(...at).withScale(scale)}
    >
      <Sphere radius={1} />
      <StandardMaterial
        base_color={color}
        perceptual_roughness={roughness}
        emissive={emissiveMul > 0 ? LinearRgba.from(Srgba.hex(color)).mul(emissiveMul) : undefined}
      />
    </Mesh3d>
  );
}

function Stick({
  id,
  a,
  b,
  r,
  color,
  castShadow = true,
  roughness = 0.52,
}: {
  id: string;
  a: V;
  b: V;
  r: number;
  color: string;
  castShadow?: boolean;
  roughness?: number;
}) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    len = Math.max(0.001, Math.hypot(dx, dy, dz));
  const rot = Quat.fromEuler('YXZ', Math.atan2(dx, dz), Math.acos(clamp(dy / len, -1, 1)), 0);
  return (
    <Mesh3d
      name={id}
      castShadow={castShadow}
      allowOverlap={id.startsWith('rod-') || id.startsWith('line-') || id.startsWith('row-')}
      transform={Transform.fromXyz((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2).withRotation(rot)}
    >
      <Cylinder radius={r} half_height={len / 2} />
      <StandardMaterial base_color={color} perceptual_roughness={roughness} />
    </Mesh3d>
  );
}

function Ring({
  id,
  at,
  r,
  color,
  tube = 0.012,
  emissiveMul = 0,
}: {
  id: string;
  at: V;
  r: number;
  color: string;
  tube?: number;
  emissiveMul?: number;
}) {
  return (
    <Mesh3d name={id} castShadow={false} allowOverlap transform={Transform.fromXyz(...at)}>
      <Torus major_radius={Math.max(0.022, r)} minor_radius={tube} />
      <StandardMaterial
        base_color={color}
        perceptual_roughness={0.40}
        emissive={emissiveMul > 0 ? LinearRgba.from(Srgba.hex(color)).mul(emissiveMul) : undefined}
      />
    </Mesh3d>
  );
}

function Shoal({ s }: { s: State }) {
  const t = s.frame / FPS;
  return (
    <>
      {Array.from({ length: 34 }, (_, i) => {
        const group = Math.floor(i / 4),
          member = i % 4;
        const phase = t * (0.24 + 0.014 * group) + group * 1.91 + member * 0.20;
        const baseX = Math.sin(group * 17.43 + 2.2) * 5.2,
          baseZ = Math.sin(group * 8.19 + 0.2) * 3.8;
        const cx = baseX + 15 * Math.round((s.x - baseX) / 15),
          cz = baseZ + 13 * Math.round((s.z - baseZ) / 13);
        const x = cx + Math.sin(phase) * (1.5 + group * 0.08) + member * 0.19;
        const z = cz + Math.cos(phase) * 0.72 + Math.sin(phase * 2 + member) * 0.18 + member * 0.21;
        const yaw =
          Math.atan2(0.72 * Math.sin(phase), (1.5 + group * 0.08) * Math.cos(phase)) +
          0.095 * wave(t * 7 + i * 3);
        const file = i % 9 === 0 ? 'carp' : i % 7 === 0 ? 'perch' : i % 2 === 0 ? 'koi' : 'minnow';
        return (
          <Asset
            key={i}
            id={'shoal-' + i}
            file={file}
            at={[x, -0.32 + 0.07 * wave(i + t * 2.1), z]}
            rot={[0, yaw, 0]}
            size={file === 'koi' ? 0.44 + 0.11 * (i % 3) : 0.48 + 0.12 * (i % 4)}
          />
        );
      })}
      <Asset
        id="spotted-ray"
        file="ray"
        at={[2.6 * Math.cos(0.18 * t + 0.35), -0.68, 2.0 * Math.sin(0.18 * t + 0.35)]}
        rot={[
          0.08 * wave(t * 2.2),
          Math.atan2(-2.0 * Math.cos(0.18 * t + 0.35), -2.6 * Math.sin(0.18 * t + 0.35)),
          0.03 * wave(t),
        ]}
        size={1.72}
      />
    </>
  );
}

function AtmosphereWildlife({ s, sun }: { s: State; sun: number }) {
  const t = s.frame / FPS;
  const fireflyGlow = smooth((sun - 0.25) / 0.35);
  return (
    <>
      {fireflyGlow > 0.02 &&
        Array.from({ length: 7 }, (_, i) => {
          const ang = i * 0.92 + t * (0.20 + (i % 3) * 0.06);
          const rad = 2.1 + (i % 4) * 1.15;
          const fx = s.x + Math.cos(ang) * rad + 0.35 * wave(t * 1.3 + i * 2.1);
          const fz = s.z + Math.sin(ang) * rad * 0.78 + 0.3 * wave(t * 1.1 + i);
          const fy = 0.45 + 0.30 * (i % 3) + 0.14 * wave(t * 2.2 + i * 1.7);
          const pulse = 0.55 + 0.45 * wave(t * 3.8 + i * 2.3);
          const r = 0.022 + 0.011 * pulse;
          return (
            <Bead
              key={i}
              id={'mote-firefly-' + i}
              at={[fx, fy, fz]}
              scale={[r, r, r]}
              color="#ffe484"
              emissiveMul={5.8 * fireflyGlow * (0.5 + 0.5 * pulse)}
              castShadow={false}
            />
          );
        })}
    </>
  );
}

export function World({ s }: { s: State }) {
  const t = s.frame / FPS,
    age = s.frame - s.since,
    hold = s.phase === 'catch',
    sun = evening(s.frame);

  const cam = getCamera(s);
  const bob = 0.024 * wave(t * 2.4) + 0.010 * wave(t * 3.7);
  const hand = bodyPoint(s, 0.13, 0.71 + bob, 0.24);
  const lift =
    s.phase === 'aim'
      ? smooth(age / 32)
      : s.phase === 'cast'
        ? 1 - smooth(age / 13)
        : s.phase === 'reel'
          ? 0.64
          : s.phase === 'lift'
            ? 0.88
            : hold
              ? 0.8
              : 0;

  const baseTip = bodyPoint(s, 0.64 - 0.56 * lift, 1.28 + bob + 0.74 * lift, 0.99 - 0.42 * lift);
  // First pass to obtain real-time fighting fish & bobber kinematics
  const k = getFishingKinematics(s, baseTip);

  // Rod bends dynamically directly toward the fighting fish's real-time water position!
  const tension =
    s.phase === 'reel' ? 0.68 + 0.24 * wave(age * 0.52) : s.phase === 'bite' ? 0.38 * wave(age * 0.75) : 0;
  const pullTarget = s.phase === 'reel' ? k.fishPos : [s.castX, 0, s.castZ];
  const tip: V = [
    baseTip[0] + (pullTarget[0] - baseTip[0]) * 0.16 * tension,
    baseTip[1] - 0.34 * tension,
    baseTip[2] + (pullTarget[2] - baseTip[2]) * 0.16 * tension,
  ];
  const rodCtrl: V = [
    (hand[0] + tip[0]) * 0.5 + (baseTip[0] - tip[0]) * 0.32,
    (hand[1] + tip[1]) * 0.5 + 0.26 * (0.4 + tension),
    (hand[2] + tip[2]) * 0.5 + (baseTip[2] - tip[2]) * 0.32,
  ];

  // Unified continuous character + oar + rod rig (ZERO 1-frame hard swaps across rowing, stowing, casting & holding!)
  const rig = getUnifiedCharacterRig(s, k, hand, rodCtrl, tip);

  // Re-evaluate cast flying float from final interpolated rod tip
  const floatPos: V = s.phase === 'cast' ? getFishingKinematics(s, rig.rodTipWorld).floatPos : k.floatPos;

  const line = ['cast', 'wait', 'bite', 'reel'].includes(s.phase);
  const lineSag = s.phase === 'reel' ? 0.012 : s.phase === 'bite' ? 0.035 : 0.11;
  const lineCtrl: V = [
    (rig.rodTipWorld[0] + floatPos[0]) * 0.5,
    (rig.rodTipWorld[1] + floatPos[1]) * 0.5 - lineSag,
    (rig.rodTipWorld[2] + floatPos[2]) * 0.5,
  ];

  const bow = bodyPoint(s, 1.48, 0.70 + bob, 0.0);
  const lanternGlow = smooth((sun - 0.16) / 0.36);
  const swimYaw = s.heading - 0.35 + 0.11 * wave(t * 1.3);
  const buddy = bodyPoint(
    s,
    -1.73 + 0.49 * wave(t * 0.51),
    0.010 + 0.015 * wave(t * 4),
    -1.7 + 0.35 * wave(t * 0.63),
  );

  const mixHex = (a: number[], b: number[], w: number) =>
    '#' +
    a
      .map((v, i) =>
        Math.round(v + (b[i] - v) * w)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');

  const splash =
    (['wait', 'bite'].includes(s.phase) && age < 14) ||
    s.phase === 'reel' ||
    (s.phase === 'lift' && age < 17);

  const rodPts = Array.from({ length: 5 }, (_, i) =>
    quadBezier(rig.rodButtWorld, rig.rodCtrlWorld, rig.rodTipWorld, i / 4),
  );
  const linePts = Array.from({ length: 7 }, (_, i) => quadBezier(rig.rodTipWorld, lineCtrl, floatPos, i / 6));

  return (
    <>
      <Camera3d
        transform={Transform.fromXyz(...cam.pos).lookingAt(cam.lookAt)}
        projection={{ Perspective: { fov: cam.fov, near: 0.1, far: 90 } }}
      >
        <DepthOfField
          focal_distance={cam.focusDist}
          aperture_f_stops={6.4 - 3.4 * cam.zoom}
          max_circle_of_confusion_diameter={8 + 10 * cam.zoom}
        />
      </Camera3d>

      <ToneMapping mode="agx" exposure={0.14} />
      <AmbientOcclusion quality="medium" thickness={0.22} />
      <Bloom intensity={0.44} threshold={0.92} />
      <Shadows distance={30} firstCascade={8} mapSize={4096} />
      <Grade
        temperature={-0.025 - sun * 0.02}
        saturation={1.14 + sun * 0.04}
        vignette={{ intensity: 0.14 + sun * 0.14, radius: 0.72, smoothness: 0.46 }}
      />

      <AmbientLight color={mixHex([206, 245, 236], [105, 138, 198], sun)} brightness={255 - sun * 105} />
      <DirectionalLight
        color={mixHex([204, 240, 255], [122, 152, 224], sun)}
        illuminance={2100 - sun * 600}
        transform={Transform.fromXyz(2, 4.5, 7).lookingAt([0, 0, 0])}
      />
      <DirectionalLight
        color={mixHex([255, 247, 224], [244, 186, 134], sun)}
        illuminance={14600 - sun * 8800}
        shadow_maps_enabled
        soft_shadow_size={1.4}
        transform={Transform.fromXyz(-5, 9 - sun * 4.5, -5).lookingAt([0, 0, 0])}
      />

      <Asset id="bed" />
      <Asset id="lagoon" />
      <Shoal s={s} />
      <Water
        s={s}
        otter={[buddy[0], buddy[2], swimYaw]}
        bow={bow}
        floatPos={floatPos}
        fishTrail={k.fishTrail}
        splashOrigin={k.splashOrigin}
      />
      <AtmosphereWildlife s={s} sun={sun} />

      <Asset id="otter" at={buddy} rot={[0.06 * wave(t * 3), swimYaw, 0.05 * wave(t * 2.7)]} size={0.86} />

      {lanternGlow > 0.02 && (
        <PointLight
          transform={Transform.fromXyz(bow[0], bow[1] + 0.12, bow[2])}
          color="#ffb038"
          intensity={440000 * lanternGlow}
          range={8.8}
        />
      )}

      <Asset id="skiff" at={[s.x, bob, s.z]} rot={[k.roll, s.heading, 0.009 * wave(t * 1.8)]} />

      {/* Unified hip-pivoted fisherman torso (single continuous mesh across ALL phases -> zero pose snap!) */}
      <Asset
        id="angler"
        file="fisher-row"
        at={rig.torsoOffset}
        rot={[k.roll, k.fisherYaw, rig.torsoPitch]}
      />

      {/* Unified real-time 2-bone IK arms blending seamlessly across oars <-> rod <-> held catch! */}
      {rig.arms.map((arm) => {
        const tag = arm.sign < 0 ? 'row-l' : 'row-r';
        return (
          <Fragment key={tag}>
            <Stick id={tag + '-upper'} a={arm.shoulderWorld} b={arm.elbowWorld} r={0.072} color="#ede4ce" roughness={0.86} />
            <Bead id={tag + '-elbow'} at={arm.elbowWorld} scale={[0.066, 0.066, 0.066]} color="#ede4ce" roughness={0.86} />
            <Stick id={tag + '-fore'} a={arm.elbowWorld} b={arm.handWorld} r={0.052} color="#dba070" roughness={0.68} />
            <Bead id={tag + '-hand'} at={arm.handWorld} scale={[0.060, 0.056, 0.054]} color="#dba070" roughness={0.68} />
          </Fragment>
        );
      })}

      {/* Symmetrical oars with smooth lift-and-stow arc (never teleporting when starting or stopping rowing!) */}
      {rig.oars.map((oar) => (
        <Asset
          key={oar.sign}
          id={'oar-' + oar.sign}
          file="oar"
          at={oar.pivotWorld}
          rot={[oar.dip, oar.rotY, 0]}
          size={1}
        />
      ))}

      {/* Crisp water spray droplets kicked up by both dipping oar blades during each power stroke */}
      {rig.rowDeploy > 0.5 &&
        rig.oars.map((oar) =>
          oar.inWater ? (
            <Fragment key={'os-' + oar.sign}>
              {[0, 1, 2].map((i) => {
                const ph = ((s.frame + i * 3) % 9) / 9;
                const ang = i * 2.1 + oar.sign * 0.6;
                const rad = 0.08 + ph * 0.24;
                const drop = 0.022 * (1 - ph) + 0.005;
                return (
                  <Bead
                    key={i}
                    id={`oar-spray-${oar.sign}-${i}`}
                    at={[
                      oar.bladeWorld[0] + rad * Math.cos(ang),
                      0.03 + ph * (1 - ph) * 0.34,
                      oar.bladeWorld[2] + rad * Math.sin(ang),
                    ]}
                    scale={[drop, drop * 1.3, drop]}
                    color="#eefaf6"
                    emissiveMul={0.5}
                    roughness={0.18}
                    castShadow={false}
                  />
                );
              })}
            </Fragment>
          ) : null,
        )}

      {/* Continuously interpolated bamboo rod (lifts smoothly off the gunwale into hand & lays smoothly back down!) */}
      {rodPts.slice(0, -1).map((p0, idx) => (
        <Stick
          key={idx}
          id={'rod-' + idx}
          a={p0}
          b={rodPts[idx + 1]}
          r={0.019 - idx * 0.003}
          color={idx === 0 ? '#784828' : '#b86838'}
          roughness={0.40}
        />
      ))}

      {/* Red cork bobber riding neatly at the rod tip whenever line is not cast */}
      {!line && s.phase !== 'lift' && (
        <Bead
          id="cork-stowed"
          at={[rig.rodTipWorld[0], rig.rodTipWorld[1] - 0.045, rig.rodTipWorld[2]]}
          scale={[0.056, 0.074, 0.056]}
          color="#ef3c26"
          roughness={0.22}
        />
      )}

      {/* Lively white spray droplets during cast splash, continuous reel fight, and dramatic fish breakout leap! */}
      {splash &&
        Array.from({ length: 7 }, (_, i) => {
          const cycle = s.phase === 'reel' ? ((age + i * 3) % 12) / 12 : clamp(age / (s.phase === 'lift' ? 17 : 14), 0, 1);
          const a = i * 2.55 + (s.phase === 'reel' ? age * 0.25 : 0);
          const radius = 0.08 + cycle * (s.phase === 'lift' ? 0.46 : s.phase === 'reel' ? 0.26 : 0.24) + (i % 3) * 0.04;
          const drop = (s.phase === 'lift' ? 0.032 : 0.020) * (1 - cycle) + 0.005;
          return (
            <Bead
              key={i}
              id={'spray-' + i}
              at={[
                k.splashOrigin[0] + radius * Math.cos(a),
                0.04 + cycle * (1 - cycle) * ((s.phase === 'lift' ? 1.15 : 0.65) + (i % 3) * 0.20),
                k.splashOrigin[1] + radius * Math.sin(a),
              ]}
              scale={[drop, drop * 1.45, drop]}
              color="#eefaf6"
              emissiveMul={0.55}
              roughness={0.15}
              castShadow={false}
            />
          );
        })}

      {/* Taut fishing line + red-and-cream cork float tracking the darting fish */}
      {line && (
        <>
          {linePts.slice(0, -1).map((p0, idx) => (
            <Stick
              key={idx}
              id={'line-' + idx}
              a={p0}
              b={linePts[idx + 1]}
              r={0.0042}
              color="#f8f5ec"
              castShadow={false}
              roughness={0.25}
            />
          ))}
          <Bead id="cork" at={floatPos} scale={[0.072, 0.098, 0.072]} color="#ef3c26" roughness={0.22} />
          <Bead
            id="cork-tip"
            at={[floatPos[0], floatPos[1] + 0.082, floatPos[2]]}
            scale={[0.033, 0.046, 0.033]}
            color="#f9dc94"
            roughness={0.30}
          />
        </>
      )}

      {/* Aiming cast marker */}
      {s.phase === 'aim' && (
        <Ring
          id="cast-marker"
          at={(() => {
            const dist = 2.15 + 1.75 * clamp(age / 36, 0, 1);
            const ang = s.heading - 1.06;
            return [s.x + dist * Math.cos(ang), 0.036, s.z - dist * Math.sin(ang)] as V;
          })()}
          r={0.16 + clamp(age / 43, 0, 1) * 0.16}
          color="#ffe388"
          tube={0.015}
          emissiveMul={1.2}
        />
      )}

      {/* Subtle golden water pulse ring only during bite (during reel, our crisp circular HUD stamina gauge takes over!) */}
      {s.phase === 'bite' && (
        <Ring
          id="strike-ring"
          at={[floatPos[0], 0.055, floatPos[2]]}
          r={0.22 + 0.18 * (1 - (age % 16) / 16)}
          color="#fff0a0"
          tube={0.020}
          emissiveMul={1.9}
        />
      )}

      {/* Fluidly approaching / biting / underwater-fighting fish with velocity-aligned heading */}
      {['wait', 'bite', 'reel'].includes(s.phase) && (
        <Asset
          id="approaching-fish"
          file={s.target}
          at={k.fishPos}
          rot={k.fishRot}
          size={s.target === 'carp' ? 1.24 : 0.88}
        />
      )}

      {hold && (
        <Asset
          id="landed-fish"
          file={s.target}
          at={bodyPoint({ ...s, heading: k.fisherYaw }, -0.14, 0.76 + bob, 0.36)}
          rot={[0, k.fisherYaw + 0.04, 0.09 * wave(t * 5)]}
          size={s.target === 'carp' ? 1.12 : 0.88}
        />
      )}

      {/* Seamless breakout leap from exact boatSide water surface directly into fisherman's cupped hands! */}
      {s.phase === 'lift' && (
        <>
          <Asset
            id="lifting-fish"
            file={s.target}
            at={k.fishPos}
            rot={k.fishRot}
            size={s.target === 'carp' ? 1.18 : 0.90}
          />
          <Bead
            id="cork-leap"
            at={[k.fishPos[0] + 0.10, k.fishPos[1] + 0.14, k.fishPos[2]]}
            scale={[0.066, 0.090, 0.066]}
            color="#ef3c26"
            roughness={0.22}
          />
        </>
      )}

      {lanternGlow > 0.02 && (
        <Bead
          id="lantern"
          at={bow}
          scale={[0.048, 0.058, 0.048]}
          color="#ffda75"
          emissiveMul={6.2 * lanternGlow}
          roughness={0.12}
          castShadow={false}
        />
      )}
    </>
  );
}
