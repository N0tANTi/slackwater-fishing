import { clamp, FPS, smooth, type State } from './game';

export type V = [number, number, number];
const wave = Math.sin;

export function bodyPoint(s: State, x: number, y: number, z: number): V {
  const c = Math.cos(s.heading),
    h = Math.sin(s.heading);
  return [s.x + c * x + h * z, y, s.z - h * x + c * z];
}

export function quadBezier(p0: V, p1: V, p2: V, t: number): V {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
}

export interface CameraInfo {
  pos: V;
  lookAt: V;
  zoom: number;
  fov: number;
  focusDist: number;
}

export function getCamera(s: State): CameraInfo {
  const zoom = clamp(s.camZoom, 0, 1);
  const aimX = s.camX;
  const aimZ = s.camZ;
  const camY = 9.05 - 4.9 * zoom;
  const camZOff = 6.95 - 2.39 * zoom;
  const lookY = 0.06 + zoom * 0.18;
  return {
    pos: [aimX, camY, aimZ + camZOff],
    lookAt: [aimX, lookY, aimZ],
    zoom,
    fov: 0.665,
    focusDist: Math.hypot(camY - lookY, camZOff),
  };
}

/** Exact perspective projection from 3D Bevy world space to 1280x720 2D HUD pixels */
export function projectToScreen(world: V, cam: CameraInfo, width = 1280, height = 720): [number, number] {
  const fx = cam.lookAt[0] - cam.pos[0];
  const fy = cam.lookAt[1] - cam.pos[1];
  const fz = cam.lookAt[2] - cam.pos[2];
  const fl = Math.hypot(fx, fy, fz) || 1;
  const f: V = [fx / fl, fy / fl, fz / fl];

  // right = normalize(cross(forward, worldUp[0,1,0])) = (-f.z, 0, f.x)
  const rx = -f[2],
    rz = f[0];
  const rl = Math.hypot(rx, rz) || 1;
  const r: V = [rx / rl, 0, rz / rl];

  // up = cross(right, forward)
  const u: V = [
    r[1] * f[2] - r[2] * f[1],
    r[2] * f[0] - r[0] * f[2],
    r[0] * f[1] - r[1] * f[0],
  ];

  const dx = world[0] - cam.pos[0];
  const dy = world[1] - cam.pos[1];
  const dz = world[2] - cam.pos[2];

  const cx = dx * r[0] + dy * r[1] + dz * r[2];
  const cy = dx * u[0] + dy * u[1] + dz * u[2];
  const cz = Math.max(0.1, dx * f[0] + dy * f[1] + dz * f[2]);

  const tanHalf = Math.tan(cam.fov * 0.5);
  const aspect = width / height;
  const ndcX = cx / (cz * tanHalf * aspect);
  const ndcY = cy / (cz * tanHalf);

  return [(ndcX * 0.5 + 0.5) * width, (0.5 - ndcY * 0.5) * height];
}

export interface FishingKinematics {
  bob: number;
  roll: number;
  speed: number;
  isRowing: boolean;
  rowDeploy: number;
  rodLift: number;
  holdWeight: number;
  stroke: number;
  fisherYaw: number;
  boatSide: V;
  floatPos: V;
  fishPos: V;
  fishRot: V;
  fishTrail: V;
  splashOrigin: [number, number];
}

function evalWaitFish(s: State, age: number, boatSide: V): V {
  const dx = s.castX - boatSide[0];
  const dz = s.castZ - boatSide[2];
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len,
    uz = dz / len;
  const px = -uz,
    pz = ux;
  const u = smooth(age / Math.max(1, s.wait));
  const dist = (1 - u) * 1.55 + 0.14;
  const lateral = Math.sin(u * Math.PI * 1.5) * 0.48 * (1 - u);
  return [s.castX + ux * dist + px * lateral, -0.26 + 0.14 * u, s.castZ + uz * dist + pz * lateral];
}

function evalReelFish(s: State, age: number, reelVal: number, boatSide: V): V {
  const dx = s.castX - boatSide[0];
  const dz = s.castZ - boatSide[2];
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len,
    uz = dz / len;
  const px = -uz,
    pz = ux;
  const u = smooth(clamp(reelVal, 0, 1));
  const isCarp = s.target === 'carp';
  // Energetic S-curve darting fight underwater, tapering cleanly as the fish nears the boat gunwale
  const envelope = Math.sin(clamp(reelVal, 0.04, 0.99) * Math.PI);
  const lateralAmp = (isCarp ? 0.92 : 0.70) * envelope + 0.12 * (1 - u);
  const sway =
    Math.sin(age * 0.25 + (isCarp ? 0.9 : 0.0)) * lateralAmp +
    0.16 * Math.sin(age * 0.54) * (1 - u * 0.45);
  const surge = Math.cos(age * 0.36) * 0.18 * envelope;
  const bx = s.castX + (boatSide[0] - s.castX) * u;
  const bz = s.castZ + (boatSide[2] - s.castZ) * u;
  const y = -0.09 + 0.055 * Math.sin(age * 0.65);
  return [bx + px * sway + ux * surge, y, bz + pz * sway + uz * surge];
}

export function getFishingKinematics(s: State, tip: V): FishingKinematics {
  const t = s.frame / FPS;
  const age = s.frame - s.since;
  const hold = s.phase === 'catch';
  const bob = 0.024 * wave(t * 2.4) + 0.010 * wave(t * 3.7);
  const roll = 0.015 * wave(t * 2.15);
  const speed = Math.min(1, Math.hypot(s.vx, s.vz) / 0.065);
  const rowDeploy = smooth(s.rowBlend);
  const rodLift = smooth(s.rodBlend);
  const holdWeight = smooth(s.holdBlend);
  const isRowing = rowDeploy > 0.01;
  const stroke = s.oarPhase;
  const fisherYaw = hold
    ? s.heading + Math.atan2(-Math.sin(s.heading), Math.cos(s.heading)) * smooth(age / 13)
    : s.heading;

  // Exact water-surface landing spot beside starboard bow (continuous handoff from reel -> lift!)
  const boatSide = bodyPoint(s, 0.52, 0.0, 0.94);

  const flying = s.phase === 'cast' ? smooth(age / 20) : 1;
  let floatPos: V = [
    tip[0] + (s.castX - tip[0]) * flying,
    0.072 + 0.020 * wave(t * 4.8),
    tip[2] + (s.castZ - tip[2]) * flying,
  ];
  if (s.phase === 'cast') {
    floatPos[1] = tip[1] * (1 - flying) + 2.55 * flying * (1 - flying) + 0.07;
  }

  let fishPos: V = [s.castX, -0.25, s.castZ];
  let fishRot: V = [0, 0, 0];
  let fishTrail: V = [s.castX, 0, s.castZ];

  if (s.phase === 'wait') {
    fishPos = evalWaitFish(s, age, boatSide);
    const prev = evalWaitFish(s, Math.max(0, age - 1), boatSide);
    const yaw = Math.atan2(-(fishPos[2] - prev[2]), fishPos[0] - prev[0]);
    fishRot = [0, yaw + 0.08 * wave(t * 6), 0.05 * wave(t * 5)];
    fishTrail = prev;
  } else if (s.phase === 'bite') {
    floatPos[1] = -0.026 + 0.082 * wave(age * 0.62);
    const dx = s.castX - boatSide[0];
    const dz = s.castZ - boatSide[2];
    const baseYaw = Math.atan2(-dz, dx) + Math.PI;
    fishPos = [
      s.castX + 0.10 * Math.cos(age * 0.45),
      -0.11 + 0.04 * wave(age * 0.65),
      s.castZ + 0.10 * Math.sin(age * 0.45),
    ];
    fishRot = [0.08 * wave(age * 0.5), baseYaw + 0.35 * wave(age * 0.55), 0.25 * wave(age * 0.7)];
    fishTrail = [s.castX, 0, s.castZ];
  } else if (s.phase === 'reel') {
    fishPos = evalReelFish(s, age, s.reel, boatSide);
    const prev = evalReelFish(s, Math.max(0, age - 1.2), clamp(s.reel - 0.045, 0, 1), boatSide);
    const trailPt = evalReelFish(s, Math.max(0, age - 4.5), clamp(s.reel - 0.16, 0, 1), boatSide);
    const vx = fishPos[0] - prev[0];
    const vz = fishPos[2] - prev[2];
    const yaw = Math.hypot(vx, vz) > 0.002 ? Math.atan2(-vz, vx) : s.heading + Math.PI;
    fishRot = [0.14 * wave(age * 0.42), yaw, 0.38 * wave(age * 0.62)];
    // Red bobber stays right on the water surface tethered to the darting fish!
    floatPos = [fishPos[0], 0.028 + 0.032 * wave(age * 0.75), fishPos[2]];
    fishTrail = trailPt;
  } else if (s.phase === 'lift') {
    // Seamless parabolic leap from exact boatSide surface -> right into fisherman's cupped hands!
    const u = smooth(age / 21);
    const holdTarget = bodyPoint({ ...s, heading: fisherYaw }, -0.14, 0.76 + bob, 0.36);
    fishPos = [
      boatSide[0] + (holdTarget[0] - boatSide[0]) * u,
      -0.06 + (holdTarget[1] + 0.06) * u + 1.05 * Math.sin(u * Math.PI),
      boatSide[2] + (holdTarget[2] - boatSide[2]) * u,
    ];
    const pitch = 0.55 * Math.cos(u * Math.PI);
    const yaw = Math.atan2(-(holdTarget[2] - boatSide[2]), holdTarget[0] - boatSide[0]);
    fishRot = [0.22 * wave(age * 0.5), yaw + (fisherYaw + 0.04 - yaw) * u, pitch];
    fishTrail = boatSide;
  }

  const splashOrigin: [number, number] =
    s.phase === 'lift'
      ? [boatSide[0], boatSide[2]]
      : s.phase === 'reel'
        ? [fishPos[0], fishPos[2]]
        : [s.castX, s.castZ];

  return {
    bob,
    roll,
    speed,
    isRowing,
    rowDeploy,
    rodLift,
    holdWeight,
    stroke,
    fisherYaw,
    boatSide,
    floatPos,
    fishPos,
    fishRot,
    fishTrail,
    splashOrigin,
  };
}

export interface OarRig {
  sign: -1 | 1;
  pivotWorld: V;
  dip: number;
  rotY: number;
  gripWorld: V;
  bladeWorld: V;
  inWater: boolean;
}

export interface ArmIK {
  sign: -1 | 1;
  shoulderWorld: V;
  elbowWorld: V;
  handWorld: V;
}

export interface UnifiedCharacterRig {
  rowDeploy: number;
  rodLift: number;
  holdWeight: number;
  torsoPitch: number;
  torsoOffset: V;
  oars: [OarRig, OarRig];
  arms: [ArmIK, ArmIK];
  rodButtWorld: V;
  rodCtrlWorld: V;
  rodTipWorld: V;
}

function lerpV(a: V, b: V, t: number): V {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function solveTwoBoneIK(shoulder: V, target: V, L1: number, L2: number, bendHint: V): V {
  const dx = target[0] - shoulder[0];
  const dy = target[1] - shoulder[1];
  const dz = target[2] - shoulder[2];
  const rawD = Math.hypot(dx, dy, dz) || 0.001;
  const d = clamp(rawD, 0.06, L1 + L2 - 0.006);
  const ux = dx / rawD,
    uy = dy / rawD,
    uz = dz / rawD;

  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

  const dot = bendHint[0] * ux + bendHint[1] * uy + bendHint[2] * uz;
  let bx = bendHint[0] - dot * ux;
  let by = bendHint[1] - dot * uy;
  let bz = bendHint[2] - dot * uz;
  const bl = Math.hypot(bx, by, bz) || 1;
  bx /= bl;
  by /= bl;
  bz /= bl;

  return [shoulder[0] + ux * a + bx * h, shoulder[1] + uy * a + by * h, shoulder[2] + uz * a + bz * h];
}

/**
 * Unified, 100% continuous character + oar + rod rig:
 * Zero hard-swaps! Hands smoothly escort oars back to stow, smoothly arc to lift the fishing rod
 * off the gunwale, track the casting/reeling rod butt, and smoothly cradle the caught fish.
 */
export function getUnifiedCharacterRig(
  s: State,
  k: FishingKinematics,
  activeRodHand: V,
  activeRodCtrl: V,
  activeRodTip: V,
): UnifiedCharacterRig {
  const age = s.frame - s.since;
  const rowDeploy = k.rowDeploy;
  const rodLift = k.rodLift;
  const holdWeight = k.holdWeight;
  const bob = k.bob;
  const stroke = k.stroke;

  // === 1. SYMMETRICAL OARS WITH NATURAL LIFT-BEFORE-STOW CURVE ===
  // Power phase (sin > 0): blades dip into water & sweep bow -> stern; recovery lifts blades clear.
  const activeSweep = 0.46 * Math.cos(stroke);
  const activeDip = 0.34 + 0.19 * Math.sin(stroke);

  // Stowed along gunwales (blades tucked neatly toward stern)
  const stowedSweep = -1.28;
  const stowedDip = 0.16;

  // Lift arc while deploying/stowing (rowDeploy in (0,1)): raises blades cleanly above the water as they swing!
  const stowArcLift = Math.sin(rowDeploy * Math.PI) * 0.16;
  const sweep = stowedSweep + (activeSweep - stowedSweep) * rowDeploy;
  const dip = stowedDip + (activeDip - stowedDip) * rowDeploy - stowArcLift;

  // === 2. CONTINUOUS HIP-PIVOTED TORSO LEAN (NO SNAP BETWEEN ROWING & FISHING!) ===
  const rowLean = -0.22 * Math.cos(stroke) * rowDeploy;
  const fishLean =
    s.phase === 'cast'
      ? 0.09 * (1 - smooth(age / 20))
      : s.phase === 'reel'
        ? -0.11 * (0.45 + 0.55 * wave(age * 0.42))
        : 0;
  const torsoPitch = rowLean + fishLean * (1 - rowDeploy);

  const hipX = -0.18;
  const hipY = 0.42;
  const cl = Math.cos(torsoPitch);
  const sl = Math.sin(torsoPitch);
  const rootOffX = hipX - (hipX * cl - hipY * sl);
  const rootOffY = hipY - (hipX * sl + hipY * cl);

  // Use fisherYaw so catch close-up turn smoothly rotates torso & shoulders together
  const yawState = { ...s, heading: k.fisherYaw };
  const torsoOffset = bodyPoint(yawState, rootOffX, bob + rootOffY, 0);

  const buildOar = (sign: -1 | 1): OarRig => {
    const px = 0.04;
    const py = 0.39 + bob;
    const pz = sign * 0.66;
    const pivotWorld = bodyPoint(s, px, py, pz);

    const rotY = s.heading + (sign > 0 ? sweep : Math.PI - sweep);
    const ox = Math.cos(dip) * Math.sin(sweep);
    const oy = -Math.sin(dip);
    const oz = sign * Math.cos(dip) * Math.cos(sweep);

    const gripLocal: V = [px - 0.36 * ox, py - 0.36 * oy, pz - 0.36 * oz];
    const bladeLocal: V = [px + 0.84 * ox, py + 0.84 * oy, pz + 0.84 * oz];
    const gripWorld = bodyPoint(s, gripLocal[0], gripLocal[1], gripLocal[2]);
    const bladeWorld = bodyPoint(s, bladeLocal[0], bladeLocal[1], bladeLocal[2]);

    return {
      sign,
      pivotWorld,
      dip,
      rotY,
      gripWorld,
      bladeWorld,
      inWater: rowDeploy > 0.65 && bladeLocal[1] < 0.05,
    };
  };

  const oarL = buildOar(-1);
  const oarR = buildOar(1);

  // === 3. SMOOTHLY INTERPOLATED FISHING ROD (NEVER TELEPORTS FROM GUNWALE TO HAND!) ===
  const stowedButt = bodyPoint(s, -0.78, 0.35 + bob, 0.48);
  const stowedTip = bodyPoint(s, 1.38, 0.47 + bob, 0.32);
  const stowedCtrl = lerpV(stowedButt, stowedTip, 0.5);

  // Gentle vertical lift arc as the fisherman picks up or lays down the rod over the gunwale
  const pickupArc = Math.sin(rodLift * Math.PI) * 0.16;
  const rodButtRaw = lerpV(stowedButt, activeRodHand, rodLift);
  const rodCtrlRaw = lerpV(stowedCtrl, activeRodCtrl, rodLift);
  const rodTipRaw = lerpV(stowedTip, activeRodTip, rodLift);
  const rodButtWorld: V = [rodButtRaw[0], rodButtRaw[1] + pickupArc * 0.65, rodButtRaw[2]];
  const rodCtrlWorld: V = [rodCtrlRaw[0], rodCtrlRaw[1] + pickupArc * 0.85, rodCtrlRaw[2]];
  const rodTipWorld: V = [rodTipRaw[0], rodTipRaw[1] + pickupArc, rodTipRaw[2]];

  // === 4. UNIFIED 2-BONE IK ARMS BLENDING SEAMLESSLY BETWEEN OARS, ROD, AND HELD FISH ===
  // When rowing/stowing oars: hands track oar handles smoothly while rowDeploy > 0.35,
  // then release cleanly to reach for the rod or resting lap!
  const gripFollow = smooth((rowDeploy - 0.18) / 0.62);

  // Fishing hand targets: right hand grips rod butt, left hand supports lower grip / reel
  const rodHandR = rodButtWorld;
  const rodHandL = lerpV(
    bodyPoint(yawState, 0.06, 0.65 + bob, 0.14),
    lerpV(rodButtWorld, rodCtrlWorld, 0.18),
    rodLift,
  );

  // Catch holding targets: both hands cup cleanly under the landed fish below his smile!
  const holdHandL = bodyPoint(yawState, -0.34, 0.72 + bob, 0.33);
  const holdHandR = bodyPoint(yawState, 0.06, 0.71 + bob, 0.34);

  const buildArm = (sign: -1 | 1, oarGrip: V, fishTarget: V, holdTarget: V): ArmIK => {
    // Smoothly blend shoulder anchor from rowing stance (x=-0.17, z=±0.21) to front-facing catch stance (x=-0.31/-0.02, z=+0.11)
    const rowShX = -0.17;
    const rowShZ = sign * 0.21;
    const holdShX = sign < 0 ? -0.31 : -0.02;
    const holdShZ = sign < 0 ? 0.10 : 0.12;
    const baseShX = rowShX + (holdShX - rowShX) * holdWeight;
    const baseShY = 0.76;
    const shLocalX = hipX + (baseShX - hipX) * cl - (baseShY - hipY) * sl;
    const shLocalY = hipY + (baseShX - hipX) * sl + (baseShY - hipY) * cl + bob;
    const shLocalZ = rowShZ + (holdShZ - rowShZ) * holdWeight;
    const shoulderWorld = bodyPoint(yawState, shLocalX, shLocalY, shLocalZ);

    // Blend seamlessly: Fishing/Rest -> Rowing Oar Grip -> Holding Catch
    let handTarget = lerpV(fishTarget, oarGrip, gripFollow);
    // Add subtle graceful arc upward as hands transition between oar handles and fishing rod
    const handTransitionArc = Math.sin(gripFollow * Math.PI) * 0.08;
    handTarget = [handTarget[0], handTarget[1] + handTransitionArc, handTarget[2]];
    handTarget = lerpV(handTarget, holdTarget, holdWeight);

    const cH = Math.cos(k.fisherYaw);
    const sH = Math.sin(k.fisherYaw);
    const bendLocalX = -0.40;
    const bendLocalY = -0.52;
    const bendLocalZ = sign * 0.62;
    const bendHint: V = [
      cH * bendLocalX + sH * bendLocalZ,
      bendLocalY,
      -sH * bendLocalX + cH * bendLocalZ,
    ];

    const elbowWorld = solveTwoBoneIK(shoulderWorld, handTarget, 0.23, 0.24, bendHint);

    return {
      sign,
      shoulderWorld,
      elbowWorld,
      handWorld: handTarget,
    };
  };

  const armL = buildArm(-1, oarL.gripWorld, rodHandL, holdHandL);
  const armR = buildArm(1, oarR.gripWorld, rodHandR, holdHandR);

  return {
    rowDeploy,
    rodLift,
    holdWeight,
    torsoPitch,
    torsoOffset,
    oars: [oarL, oarR],
    arms: [armL, armR],
    rodButtWorld,
    rodCtrlWorld,
    rodTipWorld,
  };
}
