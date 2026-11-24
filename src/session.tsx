import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useGameState } from 'raea';
import { demoStep, FPS, initial, step } from './game';
import { Hud } from './hud';
import { World } from './world';
export function Session({ demo = false }: { demo?: boolean }) {
  const frame = useCurrentFrame();
  const s = useGameState(initial, demo ? demoStep : step);
  const soundAge = frame - s.soundAt;
  const effectFrames: Record<string, number> = { cast: 13, plop: 16, strike: 19, land: 28 };
  const length = effectFrames[s.sound] ?? 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#226b68' }}>
      <World s={s} />
      <Hud s={s} demo={demo} />
      <Sequence from={Math.floor(frame / (12 * FPS)) * 12 * FPS} durationInFrames={12 * FPS} layout="none">
        <Audio src={staticFile('lake.wav')} gainDb={-5} />
      </Sequence>
      {s.sound && soundAge >= 0 && soundAge < length && (
        <Sequence from={s.soundAt} durationInFrames={length} layout="none">
          <Audio src={staticFile(s.sound + '.wav')} gainDb={-4} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
