import { clamp, evening, smooth, species, type Species, type State } from './game';
import { bodyPoint, getCamera, getFishingKinematics, projectToScreen } from './motion';

const paper = '#f7f1de';
const paperSoft = 'rgba(247, 241, 222, 0.94)';
const ink = '#183b34';
const muted = '#4f6d63';
const brass = 'rgba(174, 138, 76, 0.45)';
const seal = '#c84f34';
const amber = '#d89a34';

const serifFont = '"Microsoft YaHei", "Microsoft YaHei UI", sans-serif';
const sansFont = '"Microsoft YaHei UI", "Microsoft YaHei", sans-serif';

function FishMark({ type, scale = 1 }: { type: Species; scale?: number }) {
  const info = species[type];
  if (type === 'carp') {
    return (
      <svg width={56 * scale} height={32 * scale} viewBox="0 0 56 32">
        {/* Flowing lantern-carp fan tail & dorsal crest */}
        <path
          d="M14 14 Q7 4 2 6 Q7 14 5 16 Q7 18 2 26 Q7 28 14 18 Z"
          fill="#e77f37"
          stroke={ink}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M19 9 Q28 2 37 7 Q31 10 21 11 Z"
          fill="#f4be58"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M13 15 Q25 4 42 11 Q51 15 43 21 Q26 29 13 17 Z"
          fill={info.color}
          stroke={ink}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Belly shimmer & pectoral fin */}
        <path d="M21 20 Q30 23 39 19" stroke="#fff0c0" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M29 18 Q24 25 19 24 Q22 19 26 17" fill="#e77f37" stroke={ink} strokeWidth="1.5" />
        {/* Delicate carp barbels (whiskers) */}
        <path d="M46 17 Q51 19 52 24" stroke={ink} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M45 18 Q49 22 48 26" stroke={ink} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="13.5" r="2.2" fill={ink} />
        <circle cx="40.7" cy="12.8" r="0.7" fill="#fff8e0" />
      </svg>
    );
  }
  return (
    <svg width={56 * scale} height={32 * scale} viewBox="0 0 56 32">
      {/* Spiky reed-perch dorsal fin & forked tail */}
      <path
        d="M14 14 L4 7 L8 16 L4 25 L14 18 Z"
        fill="#c68d46"
        stroke={ink}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18 10 L23 4 L27 7 L31 4 L35 9 Z"
        fill="#c68d46"
        stroke={ink}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 15 Q26 5 43 12 Q50 15.5 43 20 Q26 27 13 17 Z"
        fill={info.color}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Reed-perch vertical bands */}
      <path d="M23 10 L21 18" stroke={info.accent} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M29 9.5 L27.5 18.5" stroke={info.accent} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M35 10.5 L33.5 17.5" stroke={info.accent} strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="40.5" cy="14" r="2.1" fill={ink} />
      <circle cx="41.2" cy="13.3" r="0.65" fill="#fff8e0" />
    </svg>
  );
}

function SunMark({ isDusk }: { isDusk: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20">
      {isDusk ? (
        <>
          <circle cx="10" cy="11" r="5" fill="#e59337" />
          <path d="M3 15 H17" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10 2.5 V4.5 M4.8 5.2 L6.2 6.6 M15.2 5.2 L13.8 6.6" stroke="#d47d2a" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="10" cy="10" r="4.2" fill="#e5b343" stroke={ink} strokeWidth="1.3" />
          <path
            d="M10 2 V4 M10 16 V18 M2 10 H4 M16 10 H18 M4.4 4.4 L5.8 5.8 M14.2 14.2 L15.6 15.6 M15.6 4.4 L14.2 5.8 M5.8 14.2 L4.4 15.6"
            stroke="#c99330"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function Hud({ s, demo }: { s: State; demo: boolean }) {
  const age = s.frame - s.since;
  const hold = s.phase === 'catch';
  const info = species[s.target];
  const sun = evening(s.frame);
  const isDusk = sun > 0.45;
  const totalCaught = s.perch + s.carp;

  const hints: Record<string, string> = {
    row: '↑ ↓ 划船前进 · ← → 转向 · 长按空格蓄力抛竿 · H 说明',
    aim: '正在蓄力抛竿 · 松开空格抛出鱼线',
    cast: '',
    wait: '静候水面浮漂动静 · 按 X 可收线',
    bite: '咬钩啦！快按住空格提竿收线',
    reel: '按住空格稳步收线，别让鱼线松弛',
    lift: '',
    catch: '',
    miss: s.miss,
  };

  const showHint = !demo && !hold && (s.phase !== 'row' || !s.used || s.help);
  const cardIn = smooth((age + 1) / 9);
  const cardOut = 1 - smooth((age - 82) / 13);
  const cardAlpha = hold ? cardIn * cardOut : 0;
  const cardSlide = (1 - cardIn) * 18;
  const aimCharge = s.phase === 'aim' ? clamp(age / 36, 0, 1) : 0;

  // Opening title lockup at the very start of the demo (0..86 frames = 0.0s..2.9s), cleanly fading out into gameplay!
  const titleIn = demo ? smooth((s.frame - 2) / 14) : 0;
  const titleOut = demo ? 1 - smooth((s.frame - 62) / 24) : 0;
  const titleAlpha = demo && s.frame <= 88 ? titleIn * titleOut : 0;
  const badgeAlpha = demo && s.frame >= 8 && s.frame <= 88 ? smooth((s.frame - 8) / 14) * titleOut : 0;

  // Cinematic trailer curtain fade-in (0..16) and lingering twilight fade-out (720..749)
  const introVeil = demo && s.frame < 16 ? 1 - smooth(s.frame / 16) : 0;
  const outroVeil = demo && s.frame >= 720 ? smooth((s.frame - 720) / 28) : 0;

  // Project the hooked fish / bobber into exact 2D screen coordinates for the diegetic circular stamina / reel gauge!
  const showGauge = s.phase === 'reel' || s.phase === 'bite';
  let gaugeScreen: [number, number] = [640, 360];
  if (showGauge) {
    const cam = getCamera(s);
    const k = getFishingKinematics(s, bodyPoint(s, 0.4, 1.3, 0.7));
    gaugeScreen = projectToScreen([k.floatPos[0], k.floatPos[1] + 0.22, k.floatPos[2]], cam);
  }
  const gaugeRadius = 30;
  const gaugeCirc = 2 * Math.PI * gaugeRadius;
  const reelFrac = clamp(s.reel, 0.04, 1);
  const slackWarn = s.phase === 'reel' && s.slack > 8;
  const ringColor = slackWarn ? '#f59f45' : s.target === 'carp' ? '#ffe58c' : '#c8f9d6';

  return (
    <>
      {/* Diegetic Circular Stamina / Reel Gauge floating right above the fighting fish (like Zelda / Slackwater!) */}
      {showGauge && (
        <div
          data-allow-overlap
          style={{
            position: 'absolute',
            left: Math.round(gaugeScreen[0] - 42),
            top: Math.round(gaugeScreen[1] - 42),
            width: 84,
            height: 84,
            pointerEvents: 'none',
          }}
        >
          {s.phase === 'reel' ? (
            <svg width="84" height="84" viewBox="0 0 84 84">
              {/* Crisp dark outer & inner borders */}
              <circle cx="42" cy="42" r={gaugeRadius} fill="none" stroke="rgba(16, 40, 34, 0.85)" strokeWidth="11.5" />
              {/* Translucent dark stamina track */}
              <circle cx="42" cy="42" r={gaugeRadius} fill="none" stroke="rgba(20, 48, 42, 0.58)" strokeWidth="7.5" />
              {/* Bright glowing mint-emerald / golden progress arc filling clockwise from 12 o'clock */}
              <circle
                cx="42"
                cy="42"
                r={gaugeRadius}
                fill="none"
                stroke={ringColor}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeDasharray={`${(gaugeCirc * reelFrac).toFixed(2)} ${gaugeCirc.toFixed(2)}`}
                transform="rotate(-90 42 42)"
              />
            </svg>
          ) : (
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle
                cx="42"
                cy="42"
                r={22 + ((age % 14) / 14) * 14}
                fill="none"
                stroke="#ffe991"
                strokeWidth="3.5"
                opacity={1 - (age % 14) / 14}
              />
              <circle cx="42" cy="42" r="15" fill="rgba(200, 79, 52, 0.92)" stroke="#fff7df" strokeWidth="2.5" />
              <path d="M42 34 V44" stroke="#fff9eb" strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="42" cy="49.5" r="2" fill="#fff9eb" />
            </svg>
          )}
        </div>
      )}
      {/* Demo Opening Title Lockup (Chinese Editorial Typography right at the beginning!) */}
      {demo && titleAlpha > 0.01 && (
        <div
          data-allow-overlap
          style={{
            position: 'absolute',
            top: 56,
            left: 0,
            width: 1280,
            textAlign: 'center',
            opacity: titleAlpha,
            transform: `translateY(${(1 - titleIn) * 10 - (1 - titleOut) * 14}px)`,
          }}
        >
          <div
            style={{
              color: paper,
              fontFamily: serifFont,
              fontWeight: 700,
              fontSize: 88,
              letterSpacing: 14,
              textShadow: '0 6px 28px rgba(10, 32, 28, 0.58)',
            }}
          >
            浅水垂钓
          </div>
          <div
            style={{
              marginTop: 4,
              color: 'rgba(247, 241, 222, 0.90)',
              fontFamily: serifFont,
              fontSize: 20,
              letterSpacing: 8,
              textShadow: '0 2px 14px rgba(10, 32, 28, 0.58)',
            }}
          >
            SLACKWATER FISHING
          </div>
        </div>
      )}

      {demo && badgeAlpha > 0.01 && (
        <div
          data-allow-overlap
          style={{
            position: 'absolute',
            bottom: 58,
            left: 0,
            width: 1280,
            display: 'flex',
            justifyContent: 'center',
            opacity: badgeAlpha,
          }}
        >
          <span
            style={{
              fontFamily: sansFont,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 2,
              color: paper,
              backgroundColor: 'rgba(24, 59, 52, 0.88)',
              border: `1px solid ${brass}`,
              padding: '8px 20px',
              borderRadius: 999,
              boxShadow: '0 6px 20px rgba(10, 30, 26, 0.3)',
            }}
          >
            基于 RAEA 引擎制作
          </span>
        </div>
      )}

      {/* Top-Right Subtle Time-of-Day Seal (Playable Mode Only) */}
      {!demo && !hold && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 999,
            backgroundColor: paperSoft,
            border: `1.5px solid ${brass}`,
            boxShadow: '0 6px 18px rgba(14, 38, 34, 0.16)',
            color: ink,
            fontFamily: sansFont,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <SunMark isDusk={isDusk} />
          <span>{isDusk ? '暮金时分' : '清昼浅水'}</span>
        </div>
      )}

      {/* Redesigned Archival Field-Journal Catch Card with charming slight tilt */}
      {hold && (
        <div
          data-allow-overlap
          style={{
            position: 'absolute',
            left: 56,
            top: 226,
            width: 368,
            padding: 8,
            backgroundColor: paperSoft,
            borderRadius: 20,
            border: `1.5px solid ${brass}`,
            boxShadow: '0 18px 44px rgba(8, 28, 34, 0.34), 0 2px 6px rgba(8, 28, 34, 0.14)',
            opacity: cardAlpha,
            transform: `translateY(${cardSlide}px) rotate(-1.6deg)`,
          }}
        >
          <div
            style={{
              border: '1px solid rgba(24, 59, 52, 0.16)',
              borderRadius: 14,
              padding: '18px 22px 20px',
              color: ink,
            }}
          >
            {/* Card Header: Species Mark + Habitat Tag + New Record Stamp */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FishMark type={s.target} scale={1.02} />
                <span
                  style={{
                    fontFamily: sansFont,
                    fontSize: 12,
                    fontWeight: 600,
                    color: muted,
                    backgroundColor: 'rgba(24, 59, 52, 0.08)',
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {info.habitat}
                </span>
              </div>
              {s.isRecord && (
                <span
                  style={{
                    fontFamily: sansFont,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff9ed',
                    backgroundColor: seal,
                    padding: '3px 9px',
                    borderRadius: 6,
                    letterSpacing: 1,
                  }}
                >
                  新纪录
                </span>
              )}
            </div>

            {/* Hero Species Name + Size Measurement */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginTop: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: serifFont,
                    fontWeight: 700,
                    fontSize: 36,
                    letterSpacing: 3,
                    lineHeight: 1.15,
                    color: ink,
                  }}
                >
                  {info.name}
                </div>
                <div
                  style={{
                    fontFamily: sansFont,
                    fontSize: 12,
                    letterSpacing: 1.5,
                    color: 'rgba(79, 109, 99, 0.78)',
                    marginTop: 2,
                  }}
                >
                  {info.sub}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span
                  style={{
                    fontFamily: sansFont,
                    fontWeight: 800,
                    fontSize: 28,
                    color: info.accent,
                  }}
                >
                  {s.size}
                </span>
                <span style={{ fontFamily: sansFont, fontSize: 14, fontWeight: 600, color: muted }}>厘米</span>
              </div>
            </div>

            {/* Archival Divider */}
            <div
              style={{
                height: 1,
                backgroundColor: 'rgba(174, 138, 76, 0.34)',
                margin: '12px 0 11px',
              }}
            />

            {/* Poetic Field Note */}
            <div
              style={{
                fontFamily: sansFont,
                fontSize: 14.5,
                lineHeight: 1.55,
                color: muted,
              }}
            >
              {info.note}
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Redesigned Fish Creel Counter */}
      {totalCaught > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            right: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: paperSoft,
            color: ink,
            borderRadius: 14,
            border: `1.5px solid ${brass}`,
            boxShadow: '0 8px 24px rgba(12, 36, 32, 0.22)',
            padding: '8px 16px',
            fontFamily: sansFont,
          }}
        >
          {s.perch > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FishMark type="perch" scale={0.58} />
              <span style={{ fontSize: 17, fontWeight: 700 }}>{s.perch}</span>
            </div>
          )}
          {s.perch > 0 && s.carp > 0 && (
            <div style={{ width: 1, height: 18, backgroundColor: 'rgba(24, 59, 52, 0.18)' }} />
          )}
          {s.carp > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FishMark type="carp" scale={0.58} />
              <span style={{ fontSize: 17, fontWeight: 700 }}>{s.carp}</span>
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: muted,
              paddingLeft: 4,
              borderLeft: '1px solid rgba(24, 59, 52, 0.14)',
            }}
          >
            共 {totalCaught} 条{!demo ? ' · J 图鉴' : ''}
          </div>
        </div>
      )}

      {/* Cohesive Bottom-Left Archival Action Prompt + Live Charge / Reel Meter */}
      {showHint && hints[s.phase] && (
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: 26,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            padding: '10px 16px',
            borderRadius: 14,
            backgroundColor: s.phase === 'bite' ? '#fff3d6' : paperSoft,
            border: `1.5px solid ${s.phase === 'bite' ? seal : s.phase === 'miss' ? 'rgba(200, 79, 52, 0.5)' : brass}`,
            boxShadow: '0 8px 24px rgba(12, 36, 32, 0.2)',
            color: s.phase === 'bite' ? seal : s.phase === 'miss' ? '#9e3e28' : ink,
            fontFamily: sansFont,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <span>{hints[s.phase]}</span>
          {(s.phase === 'aim' || s.phase === 'reel') && (
            <div
              style={{
                width: 220,
                height: 7,
                borderRadius: 999,
                backgroundColor: 'rgba(24, 59, 52, 0.14)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round((s.phase === 'aim' ? aimCharge : s.reel) * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: s.phase === 'aim' ? amber : '#2e8a6b',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Top-Left Chinese Controls Sheet (Toggle with H) */}
      {s.help && !demo && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 26,
            backgroundColor: paperSoft,
            color: ink,
            padding: '14px 18px',
            borderRadius: 16,
            border: `1.5px solid ${brass}`,
            boxShadow: '0 10px 28px rgba(12, 36, 32, 0.2)',
            fontFamily: sansFont,
            fontSize: 14,
            lineHeight: 1.75,
          }}
        >
          <div style={{ fontFamily: serifFont, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>操作指南</div>
          <div>
            <b>W / S / ↑ / ↓</b> 划船前进后退 · <b>A / D / ← / →</b> 转向与瞄准
          </div>
          <div>
            <b>长按空格</b> 蓄力抛竿 · 浮漂下沉后<b>按住空格</b>提竿收线
          </div>
          <div>
            <b>X</b> 提前收线 · <b>J</b> 查看鱼获图鉴 · <b>H</b> 收起说明
          </div>
        </div>
      )}

      {/* Field-Journal Catch Log Panel (Toggle with J / Tab) */}
      {s.journal && !demo && !hold && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            right: 26,
            width: 310,
            padding: '16px 20px',
            borderRadius: 18,
            backgroundColor: paperSoft,
            border: `1.5px solid ${brass}`,
            boxShadow: '0 14px 36px rgba(12, 36, 32, 0.25)',
            color: ink,
            fontFamily: sansFont,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(174, 138, 76, 0.35)',
            }}
          >
            <span style={{ fontFamily: serifFont, fontSize: 20, fontWeight: 700 }}>浅水鱼获图鉴</span>
            <span style={{ fontSize: 12, color: muted }}>按 J 收起</span>
          </div>
          {(['perch', 'carp'] as Species[]).map((sp) => {
            const count = sp === 'perch' ? s.perch : s.carp;
            const best = sp === 'perch' ? s.bestPerch : s.bestCarp;
            const item = species[sp];
            return (
              <div
                key={sp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 0',
                  opacity: count > 0 ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FishMark type={sp} scale={0.72} />
                  <div>
                    <div style={{ fontFamily: serifFont, fontWeight: 700, fontSize: 17 }}>
                      {count > 0 ? item.name : '？？？'}
                    </div>
                    <div style={{ fontSize: 12, color: muted }}>{item.habitat}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>{count} 条</div>
                  <div style={{ color: muted }}>{best > 0 ? `最大 ${best} 厘米` : '尚未钓获'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Silky trailer fade-in & twilight exhale fade-out veil (demo mode only) */}
      {(introVeil > 0.005 || outroVeil > 0.005) && (
        <div
          data-allow-overlap
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1280,
            height: 720,
            backgroundColor: outroVeil > 0 ? '#0b1c26' : '#0c2726',
            opacity: Math.max(introVeil, outroVeil),
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  );
}
