"""Synthesize the lagoon and fishing sounds, without external recordings."""

from array import array
from math import cos, exp, pi, sin
from random import Random
import wave
from geometry import OUT


def soundscape():
    sr = 24000
    for kind, duration in [("lake", 12), ("cast", 0.45), ("plop", 0.55), ("strike", 0.65), ("land", 0.95)]:
        rng = Random(45)
        samples = array("h")
        lp = 0
        for i in range(int(sr * duration)):
            t = i / sr
            lp = 0.89 * lp + 0.11 * rng.uniform(-1, 1)
            edge = min(1, t * 80, (duration - t) * 40)
            if kind == "lake":
                swell = 0.5 + 0.25 * cos(t * pi / 2) + 0.22 * cos(t * pi * 2 / 3)
                v = lp * (0.08 + 0.16 * swell) + 0.011 * sin(2 * pi * 64 * t + 0.6 * cos(t * pi / 3))
                for start, freq in [(2.4, 1850), (2.67, 2170), (8.2, 1650)]:
                    d = t - start
                    if 0 < d < 0.13:
                        v += 0.036 * sin(d * pi / 0.13) ** 2 * sin(2 * pi * (freq * d + 430 * d * d))
            elif kind == "cast":
                v = lp * 0.62 * sin(pi * t / duration) ** 2
            elif kind in ("plop", "strike"):
                v = 0.47 * exp(-t * 13) * sin(2 * pi * (390 * t - 340 * t * t)) + 0.52 * exp(-t * 7) * lp
                if kind == "strike":
                    v += 0.33 * lp * exp(-abs(t - 0.18) * 14)
            else:
                v = sum(
                    0.13 * exp(-4 * max(0, t - d)) * sin(2 * pi * f * (t - d))
                    for d, f in [(0, 523.25), (0.095, 659.25), (0.21, 783.99)]
                    if t >= d
                )
            samples.append(int(max(-1, min(1, v * edge)) * 32767))
        with wave.open(str(OUT / (kind + ".wav")), "wb") as out:
            out.setparams((1, 2, sr, 0, "NONE", "not compressed"))
            out.writeframes(samples.tobytes())
