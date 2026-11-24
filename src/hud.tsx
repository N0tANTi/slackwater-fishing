import { species, type Species, type State } from './game';
const paper = '#f4efd4',
  ink = '#173d34';
function FishMark({ type, scale = 1 }: { type: Species; scale?: number }) {
  return (
    <svg width={46 * scale} height={26 * scale} viewBox="0 0 46 26">
      <path
        d="M12 11 Q23 -2 38 8 Q47 14 38 19 Q23 28 12 16 L3 22 L5 13 L3 4 Z"
        fill={species[type].color}
        stroke={ink}
        strokeWidth="2.1"
      />
      <circle cx="35" cy="11" r="1.8" fill={ink} />
    </svg>
  );
}
export function Hud({ s, demo }: { s: State; demo: boolean }) {
  const age = s.frame - s.since,
    hold = s.phase === 'catch',
    info = species[s.target];
  const hints: Record<string, string> = {
    row: '↑ ↓  Row     ← →  Turn     Space  Cast',
    aim: 'Release to cast',
    cast: '',
    wait: 'Watch the float',
    bite: 'Strike!  Hold Space',
    reel: 'Hold to reel in',
    lift: '',
    catch: '',
    miss: s.miss,
  };
  const showHint = !demo && !hold && (s.phase !== 'row' || !s.used || s.help);
  return (
    <>
      {demo && s.frame >= 683 && (
        <div
          style={{
            position: 'absolute',
            top: 62,
            left: 0,
            width: 1280,
            textAlign: 'center',
            color: paper,
            fontFamily: 'Georgia',
            fontWeight: 700,
            fontSize: 110,
            opacity: Math.min(1, (s.frame - 683) / 25),
          }}
        >
          Slackwater
        </div>
      )}
      {demo && s.frame >= 706 && (
        <div
          style={{
            position: 'absolute',
            bottom: 66,
            left: 0,
            width: 1280,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'Arial',
              fontSize: 17,
              fontWeight: 700,
              color: paper,
              backgroundColor: ink,
              padding: '8px 18px',
              borderRadius: 18,
            }}
          >
            Made with RAEA
          </span>
        </div>
      )}
      {hold && (
        <div
          style={{
            position: 'absolute',
            left: 58,
            top: 253,
            width: 337,
            padding: '20px 24px',
            backgroundColor: paper,
            color: ink,
            borderRadius: 17,
            opacity: Math.min(1, (age + 1) / 7),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'Arial',
              fontWeight: 700,
              fontSize: 24,
            }}
          >
            <FishMark type={s.target} />
            <span>{s.size} cm</span>
          </div>
          <div style={{ fontFamily: 'Georgia', fontWeight: 700, fontSize: 36, marginTop: 8 }}>
            {info.name}
          </div>
          <div style={{ fontFamily: 'Arial', fontSize: 17, marginTop: 3 }}>{info.note}</div>
        </div>
      )}
      {s.carp + s.perch > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 29,
            right: 27,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            backgroundColor: paper,
            color: ink,
            borderRadius: 11,
            padding: '6px 13px',
            fontFamily: 'Arial',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {s.perch > 0 && <FishMark type="perch" scale={0.65} />}
          {s.carp > 0 && <FishMark type="carp" scale={0.65} />}
          <span>{s.carp + s.perch}</span>
        </div>
      )}
      {showHint && hints[s.phase] && (
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: 28,
            padding: '6px 12px',
            borderRadius: 9,
            backgroundColor: '#153c38ce',
            color: '#fff1cd',
            fontFamily: 'Arial',
            fontSize: 17,
          }}
        >
          {hints[s.phase]}
        </div>
      )}
      {s.help && !demo && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 26,
            backgroundColor: paper,
            color: ink,
            padding: '10px 16px',
            borderRadius: 12,
            fontFamily: 'Arial',
            fontSize: 17,
          }}
        >
          WASD / Arrows · Space to cast, strike & reel · X retrieves line · H hides help
        </div>
      )}
    </>
  );
}
