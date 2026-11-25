"""Synthesize cozy lakeside BGM (acoustic guitar, warm pad, kalimba) and tuned foley/ambience."""

from array import array
from math import cos, exp, pi, sin
from random import Random
import wave
import numpy as np
from geometry import OUT


def _write_wav(path, samples_f32, sr=48000, stereo=False):
    clipped = np.clip(samples_f32, -0.98, 0.98)
    pcm = (clipped * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setparams((2 if stereo else 1, 2, sr, 0, "NONE", "not compressed"))
        out.writeframes(pcm.tobytes())


def _karplus_strong(freq, duration, sr, rng, brightness=0.52, decay=0.9965):
    """Physical-modeling nylon acoustic guitar pluck."""
    n = int(sr * duration)
    period = max(2, int(round(sr / freq)))
    # Soft filtered initial pluck excitation (warm nylon-string body)
    noise = rng.uniform(-1.0, 1.0, period).astype(np.float64)
    # 3-tap smoothing for warm mellow fingerpicked tone
    buf = np.convolve(noise, [0.22, 0.56, 0.22], mode="same")
    buf -= np.mean(buf)
    out = np.zeros(n, dtype=np.float64)
    idx = 0
    prev = 0.0
    a = brightness
    for i in range(n):
        cur = buf[idx]
        out[i] = cur
        nxt = buf[(idx + 1) % period]
        # Low-pass damped string reflection
        filt = decay * (a * cur + (1.0 - a) * nxt)
        prev = 0.15 * prev + 0.85 * filt
        buf[idx] = prev
        idx = (idx + 1) % period
    # Soft 6ms finger attack + gentle tail release
    att = min(n, int(sr * 0.006))
    rel = min(n, int(sr * 0.06))
    out[:att] *= np.linspace(0.0, 1.0, att)
    out[n - rel :] *= np.linspace(1.0, 0.0, rel)
    return out


def _kalimba_note(freq, duration, sr):
    """Warm wooden thumb-piano / celesta chime with gentle tine overtone."""
    n = int(sr * duration)
    t = np.arange(n, dtype=np.float64) / sr
    # Fundamental + soft wooden 2nd & metallic 3rd overtone
    env = np.exp(-2.4 * t) * (1.0 - np.exp(-260.0 * t))
    sig = (
        0.74 * np.sin(2.0 * pi * freq * t)
        + 0.18 * np.exp(-6.5 * t) * np.sin(2.0 * pi * freq * 2.0 * t)
        + 0.06 * np.exp(-14.0 * t) * np.sin(2.0 * pi * freq * 2.98 * t)
        + 0.04 * np.exp(-42.0 * t) * np.sin(2.0 * pi * freq * 5.4 * t)
    )
    rel = min(n, int(sr * 0.05))
    env[n - rel :] *= np.linspace(1.0, 0.0, rel)
    return sig * env


def _pad_chord(freqs, duration, sr):
    """Lush warm Rhodes-like sustained chord pad with slow gentle shimmer."""
    n = int(sr * duration)
    t = np.arange(n, dtype=np.float64) / sr
    att = min(n, int(sr * 0.45))
    rel = min(n, int(sr * 0.65))
    env = np.ones(n, dtype=np.float64)
    env[:att] = np.sin(np.linspace(0.0, pi * 0.5, att)) ** 2
    env[n - rel :] = np.cos(np.linspace(0.0, pi * 0.5, rel)) ** 2
    trem = 0.92 + 0.08 * np.sin(2.0 * pi * 1.45 * t)
    sig = np.zeros(n, dtype=np.float64)
    for idx, f in enumerate(freqs):
        det = 1.0 + (idx - 1.5) * 0.0008
        sig += (
            0.68 * np.sin(2.0 * pi * f * det * t)
            + 0.22 * np.sin(2.0 * pi * f * 2.0 * t) * np.exp(-0.55 * t)
            + 0.06 * np.sin(2.0 * pi * f * 3.0 * t) * np.exp(-1.1 * t)
        )
    return (sig / max(1, len(freqs))) * env * trem


def _simple_reverb(left, right, sr):
    """Subtle warm lakeside stereo ambience reverb."""
    out_l = left.copy()
    out_r = right.copy()
    taps = [
        (0.029, 0.20, 0.12),
        (0.053, 0.13, 0.18),
        (0.089, 0.14, 0.09),
        (0.137, 0.08, 0.12),
        (0.193, 0.07, 0.06),
    ]
    for delay_s, gl, gr in taps:
        d = int(sr * delay_s)
        if d < len(left):
            out_l[d:] += gl * right[:-d]
            out_r[d:] += gr * left[:-d]
    return out_l, out_r


def _mix_in(left, right, sig, start_s, gain, pan, sr):
    i0 = int(round(start_s * sr))
    if i0 >= len(left):
        return
    i1 = min(len(left), i0 + len(sig))
    chunk = sig[: i1 - i0] * gain
    gl = cos((pan + 1.0) * pi * 0.25)
    gr = sin((pan + 1.0) * pi * 0.25)
    left[i0:i1] += chunk * gl
    right[i0:i1] += chunk * gr


def compose_bgm():
    """Compose a 25-second cozy, leisurely F-major acoustic lakeside BGM."""
    sr = 48000
    duration = 25.0
    n = int(sr * duration)
    rng = np.random.default_rng(2026)
    left = np.zeros(n, dtype=np.float64)
    right = np.zeros(n, dtype=np.float64)

    # Note frequencies (Hz) in cozy F Major / D Minor pentatonic
    N = {
        "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "Bb3": 233.08,
        "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "Bb4": 466.16,
        "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00,
    }

    # Leisurely 80 BPM -> 0.75s per quarter beat, 3.0s per gentle 4-beat bar (8 bars = 24.0s + 1.0s warm tail)
    beat = 0.75

    # 8-bar progression: warm sunny Fmaj7 -> Dm9 -> Bbmaj7 -> C9sus4, then glowing sunset variation resolving to Fmaj9!
    bars = [
        # Bar 0 (0.0s): Fmaj7 — peaceful sunny opening
        (["F3", "C4", "E4", "A4", "C4", "A4", "E4", "G4"], ["F3", "A3", "C4", "E4"]),
        # Bar 1 (3.0s): Dm9 — gentle drifting water
        (["D3", "A3", "E4", "F4", "A3", "F4", "E4", "C4"], ["D3", "F3", "A3", "E4"]),
        # Bar 2 (6.0s): Bbmaj7 — sunlit bobber & first catch
        (["Bb3", "F4", "A4", "D4", "F4", "A4", "C5", "A4"], ["Bb3", "D4", "F4", "A4"]),
        # Bar 3 (9.0s): C9sus4 -> C7 — warm smile & breeze
        (["C3", "G3", "D4", "F4", "G3", "E4", "D4", "C4"], ["C3", "G3", "Bb3", "D4"]),
        # Bar 4 (12.0s): Fmaj7 — rowing into golden twilight
        (["F3", "C4", "E4", "A4", "C5", "A4", "E4", "C4"], ["F3", "A3", "C4", "E4"]),
        # Bar 5 (15.0s): Dm9 — bow lantern glowing on indigo water
        (["D3", "A3", "E4", "F4", "C5", "A4", "E4", "F4"], ["D3", "F3", "A3", "E4"]),
        # Bar 6 (18.0s): Bbmaj7 -> C6 — Lantern Carp rising in golden light
        (["Bb3", "F4", "A4", "D5", "C4", "G4", "A4", "E4"], ["Bb3", "D4", "F4", "A4"]),
        # Bar 7 (21.0s): Fmaj9 — warm lingering lakeside cadence
        (["F3", "C4", "G4", "A4", "C5", "E5"], ["F3", "A3", "C4", "G4"]),
    ]

    for b_idx, (arp, pad_notes) in enumerate(bars):
        t_bar = b_idx * 4.0 * beat
        # Sustained warm felt-piano pad (slightly warmer & fuller in dusk bars 4..7)
        pad_dur = 3.9 if b_idx == 7 else 3.25
        pad = _pad_chord([N[k] for k in pad_notes], pad_dur, sr)
        pad_gain = 0.145 if b_idx < 4 else 0.165
        _mix_in(left, right, pad, t_bar, pad_gain, -0.08 if b_idx % 2 == 0 else 0.08, sr)

        # Gentle fingerpicked nylon acoustic guitar eighth-note arpeggio
        for step, note_name in enumerate(arp):
            # Final bar slows naturally (ritardando) on the last resolving strum!
            dt = step * (beat * 0.5) if b_idx < 7 else step * (beat * 0.56)
            pluck_dur = 2.6 if b_idx == 7 and step >= 4 else 1.85
            pluck = _karplus_strong(N[note_name], pluck_dur, sr, rng, brightness=0.46, decay=0.9968)
            vel = 0.24 if step == 0 else (0.17 if step % 2 == 0 else 0.135)
            pan = -0.28 if step % 2 == 0 else 0.18
            _mix_in(left, right, pluck, t_bar + dt, vel, pan, sr)

    # Cozy, unhurried kalimba / celesta melody floating gently above the guitar
    melody = [
        # Bar 0-1: sunny serene motif
        (0.75, "A4", 1.5, 0.16), (1.875, "C5", 1.4, 0.18), (2.625, "D5", 1.2, 0.15),
        (3.00, "C5", 1.8, 0.17), (4.50, "A4", 1.5, 0.15), (5.25, "G4", 1.3, 0.14),
        # Bar 2-3: playful breezy lift
        (6.00, "A4", 1.6, 0.17), (7.125, "D5", 1.5, 0.18), (8.25, "C5", 1.4, 0.16),
        (9.00, "G4", 1.9, 0.16), (10.50, "A4", 1.5, 0.14), (11.25, "C5", 1.3, 0.15),
        # Bar 4-5: golden twilight bloom (slightly higher, luminous)
        (12.00, "E5", 1.8, 0.17), (13.50, "D5", 1.5, 0.16), (14.25, "C5", 1.4, 0.15),
        (15.00, "F5", 1.9, 0.18), (16.50, "E5", 1.5, 0.16), (17.25, "C5", 1.4, 0.15),
        # Bar 6-7: Lantern Carp golden sparkle & peaceful home resolution
        (18.00, "D5", 1.7, 0.18), (19.125, "F5", 1.6, 0.19), (20.25, "E5", 1.5, 0.17),
        (21.00, "C5", 2.4, 0.18), (22.125, "A4", 2.4, 0.16), (23.10, "F5", 1.8, 0.14),
    ]
    for onset, note_name, dur, gain in melody:
        tone = _kalimba_note(N[note_name], dur, sr)
        _mix_in(left, right, tone, onset, gain, 0.22, sr)

    # Warm stereo lakeside reverb
    left, right = _simple_reverb(left, right, sr)

    # Silky 0.6s intro fade-in & 1.3s lingering outro fade-out
    fin = int(sr * 0.60)
    fout = int(sr * 1.35)
    left[:fin] *= np.sin(np.linspace(0.0, pi * 0.5, fin)) ** 2
    right[:fin] *= np.sin(np.linspace(0.0, pi * 0.5, fin)) ** 2
    left[n - fout :] *= np.cos(np.linspace(0.0, pi * 0.5, fout)) ** 2
    right[n - fout :] *= np.cos(np.linspace(0.0, pi * 0.5, fout)) ** 2

    # Gentle soft-knee mastering normalize to -3 dB peak (warm, zero clipping)
    peak = max(1e-6, float(max(np.max(np.abs(left)), np.max(np.abs(right)))))
    scale = 0.72 / peak
    stereo = np.stack([left * scale, right * scale], axis=-1)
    _write_wav(OUT / "bgm.wav", stereo, sr=sr, stereo=True)


def soundscape():
    # 1. Compose full 25s cozy lakeside acoustic BGM
    compose_bgm()

    # 2. Synthesize clean, soft, low-hiss lakeside ambience & F-major harmonized fishing foley
    sr = 24000
    for kind, duration in [("lake", 12), ("cast", 0.45), ("plop", 0.55), ("strike", 0.65), ("land", 1.10)]:
        rng = Random(45)
        samples = array("h")
        lp = 0.0
        lp2 = 0.0
        lp3 = 0.0
        for i in range(int(sr * duration)):
            t = i / sr
            raw = rng.uniform(-1, 1)
            lp = 0.89 * lp + 0.11 * raw
            lp2 = 0.965 * lp2 + 0.035 * lp
            lp3 = 0.985 * lp3 + 0.015 * lp2
            edge = min(1.0, t * 75, (duration - t) * 38)
            if kind == "lake":
                # Extra-smooth, cozy, hiss-free lakeside water lapping + faint distant bird chirps
                swell = 0.5 + 0.28 * cos(t * pi / 2) + 0.20 * cos(t * pi * 2 / 3)
                v = lp3 * (0.14 + 0.22 * swell) + lp2 * (0.025 + 0.035 * swell)
                for start, freq, span in [(2.6, 1760, 0.14), (2.86, 2093, 0.12), (8.4, 1568, 0.15)]:
                    d = t - start
                    if 0 < d < span:
                        env = sin(d * pi / span) ** 2
                        v += 0.016 * env * sin(2 * pi * (freq * d + 340 * d * d))
            elif kind == "cast":
                # Silky rod whoosh
                whoosh = (lp - lp2) * 1.1 + lp2 * 0.55
                v = whoosh * 0.55 * sin(pi * t / duration) ** 2
            elif kind == "plop":
                # Crisp upward pitch-sweep water droplet "bloop!"
                bubble_f = 280 + 500 * (1 - exp(-t * 19))
                v = 0.46 * exp(-t * 15) * sin(2 * pi * bubble_f * t) + 0.28 * exp(-t * 9.0) * lp2
            elif kind == "strike":
                # Lively splash + taut line pull
                bubble_f = 350 - 170 * t
                v = 0.40 * exp(-t * 12) * sin(2 * pi * bubble_f * t)
                v += 0.48 * exp(-t * 6.8) * lp + 0.28 * lp2 * exp(-abs(t - 0.16) * 15)
            else:
                # Warm F-Major marimba/kalimba sparkle chime (F5 - A5 - C6 - F6) — 100% in key with BGM!
                notes = [(0.0, 698.46, 0.14), (0.085, 880.00, 0.13), (0.175, 1046.50, 0.13), (0.28, 1396.91, 0.10)]
                v = 0.0
                for d, f, amp in notes:
                    if t >= d:
                        dt = t - d
                        v += amp * exp(-3.6 * dt) * (
                            0.80 * sin(2 * pi * f * dt)
                            + 0.15 * exp(-10 * dt) * sin(2 * pi * f * 2.0 * dt)
                            + 0.05 * exp(-18 * dt) * sin(2 * pi * f * 3.0 * dt)
                        )
            samples.append(int(max(-1, min(1, v * edge)) * 32767))
        with wave.open(str(OUT / (kind + ".wav")), "wb") as out:
            out.setparams((1, 2, sr, 0, "NONE", "not compressed"))
            out.writeframes(samples.tobytes())
