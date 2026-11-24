"""Write a periodic tangent normal map as a lossless RGB PNG."""

from math import tau
import struct
from zlib import compress, crc32
import numpy as np
from geometry import OUT


def ripple_map():
    n = 512
    v, u = np.mgrid[0:n, 0:n] * (tau / n)
    h = (
        0.4 * np.sin(3 * u + 5 * v + 1.3 * np.sin(2 * u - v))
        + 0.23 * np.sin(7 * v - 2 * u + 0.8 * np.cos(3 * v - u))
        + 0.11 * np.cos(9 * u + 14 * v + np.sin(4 * v))
    )
    nx = (np.roll(h, 1, 1) - np.roll(h, -1, 1)) * 1.3
    ny = (np.roll(h, 1, 0) - np.roll(h, -1, 0)) * 1.3
    length = np.sqrt(1 + nx * nx + ny * ny)
    rgb = np.stack([nx / length * 0.5 + 0.5, ny / length * 0.5 + 0.5, 0.5 + 0.5 / length], axis=-1)
    rows = (np.clip(rgb, 0, 1) * 255).astype("uint8")

    def chunk(tag, payload):
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", crc32(tag + payload) & 0xFFFFFFFF)
        )

    data = b"".join(b"\0" + row.tobytes() for row in rows)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", compress(data, 9))
        + chunk(b"IEND", b"")
    )
    (OUT / "wave-normal.png").write_bytes(png)
