import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useGameState } from 'raea';
import { demoStep, FPS, initial, step } from './game';
import { Hud } from './hud';
import { World } from './world';

export function Session({ demo = false }: { demo?: boolean }) {
  const frame = useCurrentFrame();
  const s = useGameState(initial, demo ? demoStep : step);
  const soundAge = frame - s.soundAt;
  const effectFrames: Record<string, number> = { cast: 13, plop: 16, strike: 19, land: 33 };
  const effectGainDb: Record<string, number> = { cast: -8, plop: -6, strike: -6, land: -5 };
  const length = effectFrames[s.sound] ?? 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#114d4c' }}>
      <World s={s} />
      <Hud s={s} demo={demo} />
      {/* Cozy acoustic guitar & kalimba lakeside BGM (loops cleanly every 25s) */}
      <Sequence from={Math.floor(frame / (25 * FPS)) * 25 * FPS} durationInFrames={25 * FPS} layout="none">
        <Audio src={staticFile('bgm.wav')} gainDb={-5.5} />
      </Sequence>
      {/* Gentle soft lakeside lapping ambience tucked warmly underneath the BGM */}
      <Sequence from={Math.floor(frame / (12 * FPS)) * 12 * FPS} durationInFrames={12 * FPS} layout="none">
        <Audio src={staticFile('lake.wav')} gainDb={-15} />
      </Sequence>
      {/* Crisp tactile fishing foley harmonized in F Major with the BGM */}
      {s.sound && soundAge >= 0 && soundAge < length && (
        <Sequence from={s.soundAt} durationInFrames={length} layout="none">
          <Audio src={staticFile(s.sound + '.wav')} gainDb={effectGainDb[s.sound] ?? -6} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
