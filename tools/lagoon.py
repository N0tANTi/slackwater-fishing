import math
from geometry import PaintedMesh, TAU, rng


def depth(x, z):
    # Matches shaders/lagoon.wesl basin_depth(p) exactly
    return (
        -1.12
        + 0.28 * math.sin(x * 0.42 + z * 0.18)
        + 0.22 * math.cos(z * 0.52 - x * 0.21)
        + 0.14 * math.sin(x * 1.15 - z * 0.65)
        - 0.18 * math.exp(-((x - 0.5) ** 2 + (z - 0.8) ** 2) * 0.035)
    )


def kelp(m, x, z, y, scale):
    green = rng.choice(["4ba16e", "5eb376", "3c8e6b", "7ec074", "34876e"])
    for _ in range(rng.randrange(4, 8)):
        a = rng.random() * TAU
        length = rng.uniform(0.24, 0.58) * scale
        dx, dz = math.cos(a) * length, math.sin(a) * length
        last = None
        for j in range(7):
            t = j / 6
            k = 0.72 * t * t + 0.13 * math.sin(t * math.pi * 2 + 0.5) * t
            w = 0.052 * scale * math.sin(math.pi * t) ** 0.7
            mid = (x + dx * k, y + length * (t + 0.2 * math.sin(t * math.pi)), z + dz * k)
            left = (mid[0] - math.sin(a) * w, mid[1] - 0.018, mid[2] + math.cos(a) * w)
            right = (mid[0] + math.sin(a) * w, mid[1] - 0.018, mid[2] - math.cos(a) * w)
            if last:
                l, c, r = last
                m.face([l, left, mid, c], green, 1.06, "foliage")
                m.face([c, mid, right, r], green, 0.80, "foliage")
            last = left, mid, right


def cabbage_kelp(m, x, z, y, scale=1.0):
    # Ruffled emerald sea-lettuce rosettes clustered around boulders (signature Slackwater flora!)
    col_outer = rng.choice(["4b9f72", "3f926d", "59aa76"])
    col_inner = rng.choice(["78c78a", "6bc284", "86d092"])
    for layer in range(2):
        petals = 6 if layer == 0 else 5
        for i in range(petals):
            a = TAU * (i + layer * 0.4) / petals + rng.uniform(-0.15, 0.15)
            r = (0.28 - layer * 0.10) * scale
            h = (0.22 + layer * 0.12) * scale
            dx, dz = math.cos(a), math.sin(a)
            px, pz = -dz * r * 0.55, dx * r * 0.55
            p0 = (x, y + 0.02, z)
            p1 = (x + dx * r * 0.65 + px, y + h * 0.85, z + dz * r * 0.65 + pz)
            p2 = (x + dx * r, y + h, z + dz * r)
            p3 = (x + dx * r * 0.65 - px, y + h * 0.85, z + dz * r * 0.65 - pz)
            m.face([p0, p1, p2, p3], col_outer if layer == 0 else col_inner, 1.0, "foliage")


def tube_sponges(m, x, z, y, palette="ochre"):
    # Iconic hollow chimney/tube coral clusters in warm ochre or cool lavender-slate!
    cols = ["c8a052", "b88c42", "d6b262"] if palette == "ochre" else ["6c7894", "7c88a6", "5c6882"]
    rim_col = "5a4326" if palette == "ochre" else "343b50"
    for j in range(rng.randrange(4, 8)):
        a = rng.random() * TAU
        d = rng.uniform(0.05, 0.34)
        tx, tz = x + math.cos(a) * d, z + math.sin(a) * d
        h = rng.uniform(0.24, 0.56)
        r_bot = rng.uniform(0.036, 0.056)
        r_top = r_bot * rng.uniform(1.12, 1.38)
        lean_x, lean_z = rng.uniform(-0.07, 0.07), rng.uniform(-0.07, 0.07)
        col = rng.choice(cols)
        # Keep tube tops gracefully submerged under water surface
        top_y = min(-0.18, y + h)
        m.tube((tx, y, tz), (tx + lean_x, top_y, tz + lean_z), r_bot, r_top, col, 8, "matte", cap=True)
        # Dark hollow opening on top rim
        m.ball((tx + lean_x, top_y + 0.005, tz + lean_z), (r_top * 0.68, 0.012, r_top * 0.68), rim_col, 7, 3, mat="matte")


def sea_urchin(m, x, z, y):
    # Cute lavender-purple spiky sea urchin nestled near rocks
    col = rng.choice(["715c9e", "846bb3", "63518d"])
    r = rng.uniform(0.085, 0.13)
    m.ball((x, y + r * 0.65, z), (r, r * 0.72, r), col, 10, 6, mat="matte")
    for k in range(7):
        a = TAU * k / 7
        m.tube(
            (x + math.cos(a) * r * 0.5, y + r * 0.65, z + math.sin(a) * r * 0.5),
            (x + math.cos(a) * r * 1.18, y + r * 1.12, z + math.sin(a) * r * 1.18),
            0.014,
            0.004,
            "9a82c9",
            4,
            "matte",
        )


def lily(m, x, z, r, flower=False, bud=False):
    gap = rng.uniform(0, TAU)
    y = 0.022
    base_col = rng.choice(["80b44e", "92c256", "70a448", "9ec95d"])
    vein_col = rng.choice(["a3cf64", "b0d872", "8bc056"])
    for i in range(20):
        a = gap + 0.18 + (TAU - 0.36) * i / 20
        b = gap + 0.18 + (TAU - 0.36) * (i + 1) / 20
        m.face(
            [
                (x, y + 0.012, z),
                (x + r * math.cos(b), y, z + r * math.sin(b)),
                (x + r * math.cos(a), y, z + r * math.sin(a)),
            ],
            vein_col if i % 5 == 0 else base_col,
            1.0,
            "foliage",
        )
    if bud and not flower:
        m.ball((x, 0.062, z), (0.042, 0.056, 0.042), "f2c4cb", 8, 5, mat="foliage")
        return
    if not flower:
        return
    petal_outer = rng.choice(["f2bfc8", "f6d4c8", "f8e6da"])
    petal_inner = rng.choice(["fce2e1", "fdf0e5", "fff8ef"])
    for layer in range(2):
        for i in range(9):
            a = TAU * (i + layer * 0.5) / 9
            v = (math.cos(a), math.sin(a))
            w = (-v[1], v[0])
            length = 0.155 - layer * 0.042
            m.face(
                [
                    (x, 0.058, z),
                    (x + length * 0.5 * v[0] + 0.039 * w[0], 0.098, z + length * 0.5 * v[1] + 0.039 * w[1]),
                    (x + length * v[0], 0.122 + 0.042 * layer, z + length * v[1]),
                    (x + length * 0.5 * v[0] - 0.039 * w[0], 0.096, z + length * 0.5 * v[1] - 0.039 * w[1]),
                ],
                petal_outer if not layer else petal_inner,
                1.0,
                "foliage",
            )
    m.ball((x, 0.112, z), (0.042, 0.036, 0.042), "f4b34a", 8, 5, mat="foliage")


def lagoon():
    m = PaintedMesh()
    size = 26
    pts = {}
    for x in range(-size, size + 1):
        for z in range(-size, size + 1):
            xx = x + rng.uniform(-0.26, 0.26)
            zz = z + rng.uniform(-0.26, 0.26)
            pts[x, z] = (xx, depth(xx, zz), zz)
    palette = ["387c6e", "408777", "32766d", "478574", "428376", "518d7b", "397a74"]
    for x in range(-size, size):
        for z in range(-size, size):
            a, b, c, d = [pts[i] for i in [(x, z), (x, z + 1), (x + 1, z + 1), (x + 1, z)]]
            color = rng.choice(palette)
            m.face([a, b, c], color, rng.uniform(0.92, 1.08), "matte")
            m.face([a, c, d], color, rng.uniform(0.94, 1.06), "matte")
    from bed import material

    m.save("bed", material)

    m = PaintedMesh()
    # Chunky, sculpted submerged river boulders (smooth serene water surface above!)
    for _ in range(440):
        x, z = rng.uniform(-22, 22), rng.uniform(-22, 22)
        y = depth(x, z)
        scale = rng.uniform(0.32, 1.15)
        for j in range(rng.randrange(2, 5)):
            dx, dz = rng.gauss(0, 0.42) * scale, rng.gauss(0, 0.40) * scale
            r = rng.uniform(0.18, 0.68) * scale
            ry = min(r * 0.62, max(0.16, -depth(x + dx, z + dz) * 0.68))
            m.ball(
                (x + dx, depth(x + dx, z + dz) + ry * 0.35, z + dz),
                (r * 1.18, ry, r * 0.88),
                rng.choice(["6a7e72", "748778", "5d746b", "7e8b77", "62786d", "85917a"]),
                9,
                5,
                rng.random() * TAU,
                0.17,
                0.16,
                "stone",
            )
        if rng.random() < 0.65:
            kelp(m, x + 0.42, z - 0.25, y, rng.uniform(0.75, 1.45))
        if rng.random() < 0.42:
            cabbage_kelp(m, x - 0.36, z + 0.32, y, rng.uniform(0.85, 1.35))

    # Fine river pebbles
    for _ in range(2100):
        x, z = rng.uniform(-22, 22), rng.uniform(-22, 22)
        r = rng.uniform(0.028, 0.12)
        m.ball(
            (x, depth(x, z) + 0.035, z),
            (r * 1.15, r * 0.52, r * 0.82),
            rng.choice(["749987", "959f87", "4d786d", "868d76", "9e9781"]),
            5,
            3,
            noise=0.16,
            mat="stone",
        )

    # Underwater swaying kelp & ruffled sea-lettuce accents
    for _ in range(380):
        x, z = rng.uniform(-21, 21), rng.uniform(-21, 21)
        kelp(m, x, z, depth(x, z), rng.uniform(0.60, 1.30))
    for _ in range(160):
        x, z = rng.uniform(-19, 19), rng.uniform(-19, 19)
        cabbage_kelp(m, x, z, depth(x, z), rng.uniform(0.8, 1.35))

    # Iconic tube sponges / chimney corals (both ochre & lavender clusters!)
    for idx in range(75):
        x, z = rng.uniform(-19, 19), rng.uniform(-19, 19)
        tube_sponges(m, x, z, depth(x, z), "ochre" if idx % 2 == 0 else "lavender")
    # Hero tube-sponge clusters placed visibly around the opening & golden-hour fishing zones
    for tx, tz, pal in [
        (-2.8, -2.5, "ochre"),
        (2.4, -3.2, "lavender"),
        (1.6, 2.9, "ochre"),
        (6.4, -5.6, "lavender"),
        (2.2, -5.5, "ochre"),
    ]:
        tube_sponges(m, tx, tz, depth(tx, tz), pal)

    # Purple sea urchins + warm terracotta starfish & branching corals
    for _ in range(95):
        x, z = rng.uniform(-19, 19), rng.uniform(-19, 19)
        sea_urchin(m, x, z, depth(x, z))
    for _ in range(110):
        x, z = rng.uniform(-19, 19), rng.uniform(-19, 19)
        y = depth(x, z) + 0.08
        colour = rng.choice(["cc8b63", "b5788a", "c49a62"])
        for j in range(5):
            a = rng.random() * TAU
            dx, dz = math.cos(a) * 0.12, math.sin(a) * 0.12
            end = (x + dx, min(-0.22, y + rng.uniform(0.16, 0.30)), z + dz)
            m.tube((x, y, z), end, 0.028, 0.017, colour, 5, "matte")
            m.tube(end, (end[0] + dx * 0.55, min(-0.18, end[1] + 0.10), end[2] + dz * 0.55), 0.017, 0.008, colour, 5, "matte")
        sx = x + 0.32
        for j in range(5):
            a = TAU * j / 5
            m.face(
                [
                    (sx - 0.038 * math.sin(a), y + 0.016, z + 0.038 * math.cos(a)),
                    (sx + 0.18 * math.cos(a), y + 0.012, z + 0.18 * math.sin(a)),
                    (sx + 0.038 * math.sin(a), y + 0.019, z - 0.038 * math.cos(a)),
                ],
                "d98656",
                1.0,
                "matte",
            )

    # Floating lily pad clusters with pink/cream water lilies framing the serene cove
    for _ in range(86):
        x, z = rng.uniform(-18, 18), rng.uniform(-18, 18)
        if x * x + z * z < 6.0:
            continue
        for j in range(rng.randrange(3, 7)):
            lily(
                m,
                x + rng.uniform(-0.52, 0.52),
                z + rng.uniform(-0.52, 0.52),
                rng.uniform(0.10, 0.24),
                flower=(j == 2 and rng.random() < 0.38),
                bud=(j == 1 and rng.random() < 0.22),
            )
    for x, z in [(-3.4, 2.2), (4.8, -1.6), (5.0, 2.4), (-1.4, -3.6), (8.2, -4.6), (7.6, -0.9)]:
        for j in range(4):
            lily(
                m,
                x + 0.28 * math.cos(j * 1.7),
                z + 0.25 * math.sin(j * 1.7),
                0.18 + 0.025 * (j % 2),
                flower=(j == 0),
                bud=(j == 2),
            )

    m.save("lagoon")


def fish(name, body_top, body_mid, body_belly, fin, marks):
    m = PaintedMesh()
    if name == "carp":
        profile = [
            (0.39, 0.006, 0.020, 0.018),
            (0.33, 0.012, 0.078, 0.064),
            (0.21, 0.020, 0.132, 0.098),
            (0.05, 0.024, 0.148, 0.106),
            (-0.11, 0.016, 0.122, 0.086),
            (-0.24, 0.006, 0.074, 0.052),
            (-0.34, 0.000, 0.036, 0.026),
        ]
    elif name == "koi":
        profile = [
            (0.34, 0.004, 0.016, 0.015),
            (0.27, 0.009, 0.068, 0.054),
            (0.14, 0.015, 0.112, 0.082),
            (-0.02, 0.014, 0.106, 0.076),
            (-0.16, 0.008, 0.078, 0.054),
            (-0.27, 0.002, 0.044, 0.030),
            (-0.35, 0.000, 0.024, 0.018),
        ]
    else:
        profile = [
            (0.36, 0.004, 0.016, 0.014),
            (0.30, 0.008, 0.068, 0.052),
            (0.18, 0.014, 0.114, 0.082),
            (0.02, 0.016, 0.126, 0.088),
            (-0.12, 0.010, 0.102, 0.070),
            (-0.24, 0.004, 0.060, 0.042),
            (-0.33, 0.000, 0.030, 0.022),
        ]

    sides = 14
    rings = []
    start_idx = len(m.points)
    for x, yc, hy, hz in profile:
        ring = []
        for i in range(sides):
            a = TAU * i / sides
            ring.append((x, yc + hy * math.cos(a), hz * math.sin(a)))
        rings.append(ring)

    snout = (profile[0][0] + 0.024, profile[0][1], 0)
    tail_pt = (profile[-1][0] - 0.02, 0, 0)
    for i in range(sides):
        n = (i + 1) % sides
        ang = TAU * (i + 0.5) / sides
        cy = math.cos(ang)
        col = body_top if cy > 0.35 else (body_belly if cy < -0.35 else body_mid)
        m.face([snout, rings[0][i], rings[0][n]], col, 1.0, "wet")
        m.face([tail_pt, rings[-1][n], rings[-1][i]], col, 1.0, "wet")

    for r_idx, (r0, r1) in enumerate(zip(rings, rings[1:])):
        for i in range(sides):
            n = (i + 1) % sides
            ang = TAU * (i + 0.5) / sides
            cy = math.cos(ang)
            if cy > 0.30:
                col = body_top
            elif cy < -0.25:
                col = body_belly
            else:
                col = body_mid
            if name == "perch" and r_idx in (1, 2, 3, 4) and r_idx % 2 == 1 and cy > -0.05:
                col = marks
            if name == "koi" and r_idx in (1, 3) and cy > 0.15:
                col = marks  # Crisp white calico koi patches!
            m.face([r0[i], r1[i], r1[n], r0[n]], col, 1.0 + rng.uniform(-0.02, 0.02), "wet")

    from mathutils import Vector

    for idx in range(start_idx, len(m.points)):
        px, minus_z, py = m.points[idx]
        m.smooth[idx] = Vector((px * 0.25, minus_z, py)).normalized()

    for side in (-1, 1):
        ex = 0.26 if name == "carp" else 0.245
        ey = 0.048
        ez = side * (0.074 if name == "carp" else 0.064)
        m.ball((ex, ey, ez), (0.029, 0.029, 0.015), "f7e29c", 10, 6, mat="wet")
        m.ball((ex + 0.005, ey + 0.002, ez + side * 0.010), (0.017, 0.018, 0.009), "1b201e", 8, 5, mat="wet")
        m.ball((ex + 0.010, ey + 0.008, ez + side * 0.015), (0.006, 0.006, 0.004), "fff9eb", 6, 4, mat="glass")

        fin_len = 0.20 if name == "carp" else 0.15
        m.face(
            [
                (0.11, -0.015, side * 0.075),
                (0.01, -0.058, side * (0.080 + fin_len)),
                (-0.09, -0.074, side * (0.075 + fin_len * 0.85)),
                (-0.03, -0.045, side * 0.076),
            ],
            fin,
            1.0,
            "fin",
        )
        m.face(
            [
                (-0.04, -0.090, side * 0.026),
                (-0.15, -0.146, side * 0.058),
                (-0.17, -0.094, side * 0.022),
            ],
            fin,
            0.94,
            "fin",
        )

        if name == "carp":
            m.path(
                [
                    (0.365, -0.010, side * 0.028),
                    (0.405, -0.036, side * 0.068),
                    (0.382, -0.066, side * 0.102),
                ],
                0.0065,
                "ffda75",
                5,
                "fin",
            )

    tail_reach = -0.60 if name == "carp" else -0.52
    tail_spread = 0.185 if name == "carp" else 0.145
    for upper in (-1, 1):
        m.face(
            [
                (-0.31, 0.034 * upper, 0),
                (tail_reach, tail_spread * upper, 0),
                (tail_reach + 0.078, 0.036 * upper, 0),
                (-0.32, 0.0, 0),
            ],
            fin,
            1.05 if upper > 0 else 0.94,
            "fin",
        )
        m.face(
            [
                (-0.32, 0.0, 0),
                (tail_reach + 0.078, 0.036 * upper, 0),
                (tail_reach + 0.098, 0.0, 0),
            ],
            marks if name == "carp" else fin,
            1.0,
            "fin",
        )

    if name == "perch":
        m.face([(-0.18, 0.092, 0), (-0.12, 0.182, 0), (-0.01, 0.198, 0), (0.10, 0.168, 0), (0.14, 0.098, 0)], fin, 1.0, "fin")
    else:
        m.face([(-0.22, 0.090, 0), (-0.15, 0.192, 0), (0.04, 0.206, 0), (0.16, 0.155, 0), (0.15, 0.100, 0)], fin, 1.04, "fin")

    m.save(name)


def ray():
    m = PaintedMesh()
    # Majestic broad blue-slate eagle ray with bold creamy-white spots (just like source.mp4!)
    m.ball((0.04, 0.025, 0), (0.50, 0.125, 0.28), "335d73", 20, 9, mat="wet")
    for side in (-1, 1):
        m.face(
            [
                (0.22, 0.014, side * 0.13),
                (0.10, 0.022, side * 0.27),
                (-0.15, -0.032, side * 0.58),
                (-0.28, -0.042, side * 0.52),
                (-0.21, -0.018, side * 0.29),
                (-0.28, 0.005, side * 0.14),
            ],
            "416d84",
            1.0,
            "wet",
        )
        m.ball((0.36, 0.040, side * 0.165), (0.024, 0.024, 0.015), "1d2d33", 8, 5, mat="wet")
    # Bold organic cream spots across the back & wings
    for i in range(44):
        x = rng.uniform(-0.36, 0.38)
        z = rng.uniform(-0.36, 0.36)
        height = 1 - ((x - 0.02) / 0.48) ** 2 - (z / 0.36) ** 2
        if height < 0.08:
            continue
        r = rng.uniform(0.022, 0.056)
        m.ball((x, 0.032 + 0.115 * math.sqrt(height), z), (r, 0.009, r * 0.85), "e4f0e8", 8, 4, mat="wet")
    m.path(
        [(-0.28, 0.023, 0), (-0.58, 0.027, 0.03), (-0.88, 0.018, 0.09), (-1.18, 0.02, 0.10)],
        0.013,
        "3e6576",
        6,
        "wet",
    )
    m.save("ray")
