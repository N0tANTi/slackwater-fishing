import math
from geometry import PaintedMesh, TAU, rng


def depth(x, z):
    return (
        -1.15
        + 0.23 * math.sin(x * 0.78 + z * 0.22)
        + 0.17 * math.cos(z * 0.95 - x * 0.26)
        + 0.09 * math.sin(x * 1.8 - z * 0.8)
    )


def kelp(m, x, z, y, scale):
    green = rng.choice(["75a669", "69ac86", "599776", "92b779", "4a987c"])
    for _ in range(rng.randrange(4, 9)):
        a = rng.random() * TAU
        length = rng.uniform(0.23, 0.62) * scale
        dx, dz = math.cos(a) * length, math.sin(a) * length
        last = None
        for j in range(7):
            t = j / 6
            k = 0.72 * t * t + 0.13 * math.sin(t * math.pi * 2 + 0.5) * t
            w = 0.055 * scale * math.sin(math.pi * t) ** 0.7
            mid = (x + dx * k, y + length * (t + 0.2 * math.sin(t * math.pi)), z + dz * k)
            left = (mid[0] - math.sin(a) * w, mid[1] - 0.018, mid[2] + math.cos(a) * w)
            right = (mid[0] + math.sin(a) * w, mid[1] - 0.018, mid[2] - math.cos(a) * w)
            if last:
                l, c, r = last
                m.face([l, left, mid, c], green, 1.04)
                m.face([c, mid, right, r], green, 0.83)
            last = left, mid, right


def lily(m, x, z, r, flower=False):
    gap = rng.uniform(0, TAU)
    y = 0.026
    for i in range(20):
        a = gap + 0.20 + (TAU - 0.40) * i / 20
        b = gap + 0.20 + (TAU - 0.40) * (i + 1) / 20
        m.face(
            [
                (x, y + 0.014, z),
                (x + r * math.cos(b), y, z + r * math.sin(b)),
                (x + r * math.cos(a), y, z + r * math.sin(a)),
            ],
            "91ac4e" if i % 4 else "9cb456",
        )
    if not flower:
        return
    for layer in range(2):
        for i in range(9):
            a = TAU * (i + layer * 0.5) / 9
            v = (math.cos(a), math.sin(a))
            w = (-v[1], v[0])
            length = 0.15 - layer * 0.04
            m.face(
                [
                    (x, 0.065, z),
                    (x + length * 0.5 * v[0] + 0.039 * w[0], 0.102, z + length * 0.5 * v[1] + 0.039 * w[1]),
                    (x + length * v[0], 0.125 + 0.04 * layer, z + length * v[1]),
                    (x + length * 0.5 * v[0] - 0.039 * w[0], 0.10, z + length * 0.5 * v[1] - 0.039 * w[1]),
                ],
                "edbec3" if not layer else "f5d9cc",
            )
    m.ball((x, 0.115, z), (0.041, 0.036, 0.041), "e8ac57", 8, 4)


def lagoon():
    m = PaintedMesh()
    size = 25
    pts = {}
    for x in range(-size, size + 1):
        for z in range(-size, size + 1):
            xx = x + rng.uniform(-0.28, 0.28)
            zz = z + rng.uniform(-0.28, 0.28)
            pts[x, z] = (xx, depth(xx, zz), zz)
    palette = ["497e70", "51897a", "447c73", "598776", "558779", "67927f", "4c817b"]
    for x in range(-size, size):
        for z in range(-size, size):
            a, b, c, d = [pts[i] for i in [(x, z), (x, z + 1), (x + 1, z + 1), (x + 1, z)]]
            color = rng.choice(palette)
            m.face([a, b, c], color, rng.uniform(0.92, 1.08))
            m.face([a, c, d], color, rng.uniform(0.94, 1.06))
    from bed import material

    m.save("bed", material)
    m = PaintedMesh()
    for _ in range(520):
        x, z = rng.uniform(-21, 21), rng.uniform(-21, 21)
        y = depth(x, z)
        scale = rng.uniform(0.27, 1.03)
        for j in range(rng.randrange(2, 6)):
            dx, dz = rng.gauss(0, 0.44) * scale, rng.gauss(0, 0.42) * scale
            r = rng.uniform(0.16, 0.65) * scale
            m.ball(
                (x + dx, depth(x + dx, z + dz) + r * 0.18, z + dz),
                (r * 1.15, r * 0.63, r * 0.82),
                rng.choice(["718675", "677e71", "778875", "5d796c", "89987b"]),
                8,
                4,
                rng.random() * TAU,
                0.20,
                0.23,
            )
        if rng.random() < 0.8:
            kelp(m, x + 0.42, z - 0.25, y, rng.uniform(0.8, 1.65))
    for _ in range(2500):
        x, z = rng.uniform(-21, 21), rng.uniform(-21, 21)
        r = rng.uniform(0.027, 0.12)
        m.ball(
            (x, depth(x, z) + 0.035, z),
            (r * 1.15, r * 0.52, r * 0.82),
            rng.choice(["779e89", "98a38b", "527d71", "879077"]),
            5,
            3,
            noise=0.18,
        )
    for _ in range(480):
        x, z = rng.uniform(-20, 20), rng.uniform(-20, 20)
        kelp(m, x, z, depth(x, z), rng.uniform(0.65, 1.45))
    # Small branching coral and shell stars add spots of warm colour between the rocks.
    for _ in range(120):
        x, z = rng.uniform(-19, 19), rng.uniform(-19, 19)
        y = depth(x, z) + 0.08
        colour = rng.choice(["c1926d", "a77a85", "b19566"])
        for j in range(5):
            a = rng.random() * TAU
            dx, dz = math.cos(a) * 0.12, math.sin(a) * 0.12
            end = (x + dx, y + rng.uniform(0.17, 0.34), z + dz)
            m.tube((x, y, z), end, 0.032, 0.020, colour, 5)
            m.tube(end, (end[0] + dx * 0.6, end[1] + 0.11, end[2] + dz * 0.6), 0.020, 0.009, colour, 5)
        sx = x + 0.3
        for j in range(5):
            a = TAU * j / 5
            m.face(
                [
                    (sx - 0.035 * math.sin(a), y + 0.015, z + 0.035 * math.cos(a)),
                    (sx + 0.17 * math.cos(a), y + 0.012, z + 0.17 * math.sin(a)),
                    (sx + 0.035 * math.sin(a), y + 0.018, z - 0.035 * math.cos(a)),
                ],
                "ce916e",
            )
    for _ in range(80):
        x, z = rng.uniform(-18, 18), rng.uniform(-18, 18)
        if x * x + z * z < 5:
            continue
        for j in range(rng.randrange(3, 8)):
            lily(
                m,
                x + rng.uniform(-0.46, 0.46),
                z + rng.uniform(-0.49, 0.49),
                rng.uniform(0.09, 0.22),
                j == 2 and rng.random() < 0.32,
            )
    for x, z in [(-3, 2), (2.8, -1.8), (4, 2.3), (-0.9, -3.4), (-4.1, -0.4)]:
        for j in range(4):
            lily(m, x + 0.25 * math.cos(j * 1.7), z + 0.23 * math.sin(j * 1.7), 0.17, j == 0 and x < 0)
    m.save("lagoon")


def fish(name, body, fin, marks):
    m = PaintedMesh()
    m.ball((0, 0, 0), (0.35, 0.122, 0.092), body, 14, 8)
    m.ball((0.18, 0.005, 0), (0.18, 0.114, 0.095), body, 12, 7)
    for side in (-1, 1):
        m.ball((0.235, 0.042, side * 0.077), (0.031, 0.031, 0.014), "e5ce87", 9, 5)
        m.ball((0.24, 0.044, side * 0.087), (0.018, 0.019, 0.008), "272c2a", 8, 5)
        m.face([(0.075, 0, side * 0.085), (-0.08, -0.055, side * 0.17), (-0.04, -0.045, side * 0.087)], fin)
        for i in range(4):
            x = -0.19 + i * 0.083
            m.face(
                [
                    (x, 0.090, side * 0.054),
                    (x + 0.026, 0.084, side * 0.065),
                    (x - 0.012, -0.018, side * (0.082 + 0.010 * math.sin(i * 0.8))),
                ],
                marks,
            )
    for upper in (-1, 1):
        m.face(
            [
                (-0.307, 0.035 * upper, 0),
                (-0.52, 0.145 * upper, 0),
                (-0.466, 0, 0),
                (-0.31, -0.017 * upper, 0),
            ],
            fin,
        )
    m.face([(-0.17, 0.093, 0), (-0.096, 0.178, 0), (0.07, 0.152, 0), (0.11, 0.09, 0)], fin)
    m.save(name)


def ray():
    m = PaintedMesh()
    # Broad spotted back, rounded snout, swept pectoral fins and a long flexible tail.
    m.ball((0.04, 0.025, 0), (0.46, 0.125, 0.25), "416777", 18, 8)
    for side in (-1, 1):
        m.face(
            [
                (0.19, 0.014, side * 0.12),
                (0.09, 0.022, side * 0.24),
                (-0.15, -0.035, side * 0.47),
                (-0.24, -0.045, side * 0.44),
                (-0.19, -0.020, side * 0.26),
                (-0.26, 0.005, side * 0.13),
            ],
            "547887",
        )
        m.ball((0.33, 0.037, side * 0.153), (0.022, 0.022, 0.014), "273a3d", 8, 4)
    for i in range(45):
        x = rng.uniform(-0.34, 0.37)
        z = rng.uniform(-0.215, 0.215)
        height = 1 - ((x - 0.04) / 0.46) ** 2 - (z / 0.25) ** 2
        if height < 0.05:
            continue
        r = rng.uniform(0.012, 0.033)
        m.ball((x, 0.029 + 0.125 * math.sqrt(height), z), (r, 0.007, r * 0.85), "d2ded0", 8, 4)
    m.path(
        [(-0.27, 0.023, 0), (-0.53, 0.027, 0.03), (-0.8, 0.018, 0.09), (-1.03, 0.02, 0.10)], 0.012, "52737b"
    )
    m.save("ray")
