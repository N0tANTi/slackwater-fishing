import math
from geometry import PaintedMesh, TAU, rng


def hull():
    m = PaintedMesh()
    stations = [
        (-1.74, 0.40, 0.08),
        (-1.55, 0.51, 0.035),
        (-1.2, 0.60, 0),
        (-0.65, 0.68, -0.013),
        (0, 0.70, -0.018),
        (0.55, 0.65, -0.002),
        (1.05, 0.51, 0.045),
        (1.45, 0.32, 0.13),
        (1.76, 0.10, 0.22),
        (1.83, 0.014, 0.27),
    ]
    # Crisp vermilion-red hull with bright cream-white stripe along the waterline & gunwale
    colors = ["73241c", "a83324", "c93f2d", "f2ead6", "d94a34", "be3827"]
    levels = [
        (-0.24, 0.43),
        (-0.08, 0.68),
        (0.055, 0.82),
        (0.16, 0.90),
        (0.245, 0.95),
        (0.305, 0.98),
        (0.37, 1.0),
    ]

    # Solid closed keel & bilge floor backing so zero light leaks through floorboards
    for (x, w, r), (nx, nw, nr) in zip(stations, stations[1:]):
        y0, ny0 = -0.24 + r, -0.24 + nr
        bw, nbw = w * 0.45, nw * 0.45
        m.face([(x, y0, -bw), (nx, ny0, -nbw), (nx, ny0, nbw), (x, y0, bw)], "59211a", 1.0, "wood")
        m.face([(x, 0.045, -w * 0.83), (x, 0.045, w * 0.83), (nx, 0.045, nw * 0.83), (nx, 0.045, -nw * 0.83)], "744e32", 1.0, "wood")

    for sign in (-1, 1):
        for (x, w, r), (nx, nw, nr) in zip(stations, stations[1:]):
            for j, ((height, width), (nh, nwidth)) in enumerate(zip(levels, levels[1:])):
                m.face(
                    [
                        (x, height + r, sign * w * width),
                        (nx, height + nr, sign * nw * width),
                        (nx, nh + nr, sign * nw * nwidth),
                        (x, nh + r, sign * w * nwidth),
                    ],
                    colors[j],
                    1.0,
                    "wood",
                )
            # Warm honey-oak interior planking
            m.face(
                [
                    (x, 0.37 + r, sign * w),
                    (nx, 0.37 + nr, sign * nw),
                    (nx, 0.12 + nr, sign * (nw - 0.065)),
                    (x, 0.12 + r, sign * (w - 0.065)),
                ],
                "c99357",
                1.0,
                "wood",
            )
            # Bold vermilion gunwale rail + crisp cream trim strip
            m.tube((x, 0.38 + r, sign * w), (nx, 0.38 + nr, sign * nw), 0.040, 0.040, "c73b2a", 9, "wood")
            m.tube(
                (x, 0.215 + r, sign * w * 0.948),
                (nx, 0.215 + nr, sign * nw * 0.948),
                0.015,
                0.015,
                "f6efe0",
                6,
                "wood",
            )
            if abs(x) < 1.5:
                m.tube(
                    (x, 0.03 + r, sign * w * 0.65),
                    (x, 0.345 + r, sign * (w - 0.04)),
                    0.030,
                    0.024,
                    "825335",
                    5,
                    "wood",
                )
        for x, w, r in stations[1:-1]:
            m.ball((x, 0.315 + r, sign * (w - 0.02)), (0.017, 0.015, 0.014), "dfb05c", 6, 3, mat="metal")

    # Stern transom (vermilion red + cream top band)
    m.box((-1.72, 0.14, 0), (0.08, 0.46, 0.76), "bf3c2b", "wood")
    m.box((-1.74, 0.415, 0), (0.10, 0.075, 0.83), "c83d2b", "wood")
    m.box((-1.765, 0.215, 0), (0.02, 0.065, 0.77), "f4ecdc", "wood")

    # Warm honey-oak floorboards
    for a, b in zip(stations, stations[1:]):
        x, w, r = a
        nx, nw, nr = b
        for j in range(7):
            one = -1 + j * 2 / 7 + 0.011
            two = -1 + (j + 1) * 2 / 7 - 0.011
            m.face(
                [
                    (x, 0.078, w * 0.83 * one),
                    (x, 0.078, w * 0.83 * two),
                    (nx, 0.078, nw * 0.83 * two),
                    (nx, 0.078, nw * 0.83 * one),
                ],
                ["dba763", "cb9556", "e4bb7c", "c18b52", "d7a56c", "e0ac6b", "c9925b"][j],
                1.0,
                "wood",
            )

    # Thwart benches + brass fasteners
    for x, w in [(-1.23, 0.96), (-0.30, 1.19), (0.84, 0.93)]:
        for j in range(2):
            m.box((x + j * 0.137, 0.28, 0), (0.132, 0.083, w), "d6aa6b" if j else "c9955c", "wood")
        for z in (-w * 0.41, w * 0.41):
            m.ball((x + 0.066, 0.326, z), (0.014, 0.008, 0.014), "c9a054", 6, 3, mat="metal")

    # Brass oarlocks placed forward beside the rower's knees so both hands & oars stay clearly visible
    for sign in (-1, 1):
        m.tube((0.04, 0.35, sign * 0.67), (0.04, 0.44, sign * 0.67), 0.021, 0.017, "b89654", 7, "metal")
        m.path(
            [(0.01, 0.45, sign * 0.67), (0.04, 0.42, sign * 0.67), (0.08, 0.46, sign * 0.67)],
            0.012,
            "dab76c",
            6,
            "metal",
        )

    # Coiled cream hemp painter rope at bow + woven olive tackle basket
    for k in range(5):
        r = 0.068 + 0.017 * k
        m.path(
            [
                (1.19 + r * math.cos(i * TAU / 22), 0.16 + k * 0.005, r * 1.22 * math.sin(i * TAU / 22))
                for i in range(23)
            ],
            0.014,
            "e5cea0",
            5,
            "matte",
        )
    m.box((-0.87, 0.205, -0.22), (0.34, 0.24, 0.30), "5f6b47", "matte")
    m.box((-0.87, 0.345, -0.22), (0.37, 0.045, 0.33), "bd965d", "wood")
    m.box((-0.70, 0.315, -0.22), (0.025, 0.055, 0.055), "dfb760", "metal")

    # Iconic curved wrought-iron shepherd's-hook bow lantern post + golden glass oil lamp
    m.path(
        [
            (1.61, 0.42, 0),
            (1.62, 0.72, 0),
            (1.60, 0.86, 0),
            (1.54, 0.90, 0),
            (1.48, 0.84, 0),
        ],
        0.019,
        "2d2926",
        8,
        "metal",
    )
    m.tube((1.48, 0.63, 0), (1.48, 0.77, 0), 0.052, 0.046, "ffd168", 12, "glass")
    m.tube((1.48, 0.60, 0), (1.48, 0.635, 0), 0.068, 0.058, "4a3a28", 10, "metal")
    m.tube((1.48, 0.77, 0), (1.48, 0.815, 0), 0.070, 0.032, "4a3a28", 10, "metal")
    for k in range(4):
        ang = k * TAU / 4 + math.pi / 4
        gx = 1.48 + 0.058 * math.cos(ang)
        gz = 0.058 * math.sin(ang)
        m.tube((gx, 0.625, gz), (gx, 0.775, gz), 0.0055, 0.0055, "4a3a28", 5, "metal")

    m.save("skiff")


def fisher(pose):
    m = PaintedMesh()
    skin = "dba070"
    shirt = "ede4ce"  # Cozy cream-white sweater shirt
    pants = "35568f"  # Rich indigo-blue denim overalls
    bib = "3e619c"
    scarf_a = "ebba3d"  # Chunky golden-mustard ribbed knit scarf
    scarf_b = "d69f2b"

    # Legs & boots
    for side in (-1, 1):
        z = 0.13 * side
        m.tube((-0.20, 0.42, z), (0.13, 0.41, z * 1.35), 0.114, 0.102, pants, 10, "matte")
        m.tube((0.12, 0.41, z * 1.35), (0.21, 0.17, z * 1.48), 0.102, 0.076, pants, 10, "matte")
        m.ball((0.27, 0.145, z * 1.48), (0.14, 0.085, 0.083), "6e4835", 10, 6, mat="wood")

    # Cream knit sweater torso
    m.ball((-0.18, 0.60, 0), (0.228, 0.292, 0.224), shirt, 16, 10, mat="matte")

    # Clean denim overalls waist, front bib, straps & brass buttons
    m.ball((-0.165, 0.485, 0.025), (0.238, 0.150, 0.234), pants, 16, 8, mat="matte")
    m.ball((-0.145, 0.63, 0.140), (0.158, 0.152, 0.115), bib, 14, 8, mat="matte")
    m.box((-0.145, 0.618, 0.246), (0.142, 0.092, 0.024), "2f4d82", "matte")
    for x in (-0.228, -0.062):
        m.tube((x, 0.835, 0.115), (x + 0.02, 0.680, 0.236), 0.028, 0.032, pants, 7, "matte")
        m.ball((x + 0.02, 0.692, 0.250), (0.017, 0.017, 0.012), "ebbf5c", 8, 4, mat="metal")

    # Iconic chunky ribbed golden-mustard knit scarf wrapped warmly around the neck!
    for idx in range(12):
        a = idx * TAU / 12
        sx = -0.142 + 0.132 * math.cos(a)
        sz = 0.012 + 0.128 * math.sin(a)
        m.ball((sx, 0.822, sz), (0.048, 0.068, 0.048), scarf_a if idx % 2 == 0 else scarf_b, 8, 5, mat="matte")
    # Cozy draped scarf tail at chest side
    m.tube((-0.055, 0.79, 0.125), (-0.035, 0.64, 0.205), 0.048, 0.042, scarf_a, 8, "matte")

    # Neck & head
    m.tube((-0.145, 0.84, 0), (-0.13, 0.92, 0), 0.088, 0.080, skin, 10, "skin")
    m.ball((-0.12, 0.992, 0.026), (0.184, 0.214, 0.170), skin, 18, 10, mat="skin")
    # Warm chestnut hair
    m.ball((-0.228, 1.036, -0.004), (0.122, 0.158, 0.154), "5b3b2a", 12, 7, mat="matte")
    for x in (-0.235, -0.165, -0.09, -0.015):
        m.ball((x, 1.116, 0.115), (0.054, 0.055, 0.050), "6c4732", 10, 6, mat="matte")
    # Ears & rosy cheeks
    for x in (-0.29, 0.044):
        m.ball((x, 0.986, 0.027), (0.042, 0.058, 0.042), skin, 10, 5, mat="skin")
    for x in (-0.202, -0.048):
        m.ball((x, 0.966, 0.168), (0.038, 0.020, 0.008), "e38566", 10, 5, mat="skin")
    # Expressive glossy eyes with catchlights + brows
    for x in (-0.198, -0.052):
        m.ball((x, 1.022, 0.182), (0.022, 0.026, 0.011), "271e1a", 10, 6, mat="wet")
        m.ball((x - 0.005, 1.029, 0.193), (0.0065, 0.0075, 0.003), "fff9e6", 6, 4, mat="glass")
        m.path(
            [(x - 0.022, 1.058, 0.158), (x, 1.064, 0.164), (x + 0.018, 1.057, 0.167)],
            0.006,
            "6e4934",
            5,
            "matte",
        )
    # Button nose & cheerful smile
    m.ball((-0.118, 0.978, 0.190), (0.033, 0.039, 0.032), "cc8a5c", 10, 6, mat="skin")
    m.path([(-0.156, 0.928, 0.174), (-0.118, 0.916, 0.183), (-0.079, 0.930, 0.174)], 0.0075, "764330", 6, "matte")

    # Wide straw hat with crisp crimson-red hatband
    m.ball((-0.13, 1.196, -0.062), (0.365, 0.046, 0.335), "ecc46c", 32, 6, mat="matte")
    m.ball((-0.13, 1.252, -0.062), (0.204, 0.130, 0.197), "e4b458", 24, 8, mat="matte")
    m.tube((-0.13, 1.210, -0.062), (-0.13, 1.248, -0.062), 0.206, 0.205, "c44331", 24, "matte")
    for i in range(3):
        r = 0.248 + 0.035 * i
        m.path(
            [
                (
                    -0.13 + r * math.cos(j * TAU / 34),
                    1.220 - 0.011 * i,
                    -0.062 + r * 0.91 * math.sin(j * TAU / 34),
                )
                for j in range(35)
            ],
            0.003,
            "c1924b",
            4,
            "matte",
        )

    # Cream sweater sleeves + hands (for "row" pose, real-time 2-bone IK arms in world.tsx lock onto the moving oar handles!)
    if pose != "row":
        if pose == "hold":
            hands = [(0.05, 0.72, 0.34), (-0.34, 0.73, 0.32)]
        elif pose == "cast":
            hands = [(-0.06, 1.00, 0.30), (0.065, 0.87, 0.23)]
        else:
            hands = [(0.15, 0.71, 0.26), (0.09, 0.66, 0.17)]

        for (sx, sz), (hx, hy, hz) in zip([(-0.02, 0.12), (-0.31, 0.10)], hands):
            elbow = (sx + 0.03, (hy + 0.74) * 0.5 - 0.09, sz + 0.14)
            m.tube((sx, 0.75, sz), elbow, 0.092, 0.075, shirt, 10, "matte")
            m.tube(elbow, (hx, hy, hz), 0.064, 0.045, skin, 9, "skin")
            m.ball((hx, hy, hz), (0.058, 0.056, 0.050), skin, 10, 6, mat="skin")

    m.save("fisher-" + pose)


def oar():
    m = PaintedMesh()
    # Warm oak shaft + bright vermilion-red painted blade tip with cream stripe!
    m.tube((0, 0, -0.37), (0, 0, 0.64), 0.022, 0.030, "c99655", 10, "wood")
    m.ball((0, 0, 0.76), (0.074, 0.023, 0.17), "d8a35d", 12, 6, mat="wood")
    m.ball((0, 0, 0.88), (0.072, 0.024, 0.095), "c8412f", 12, 6, mat="wood")
    m.tube((0, 0, 0.79), (0, 0, 0.82), 0.048, 0.052, "f4ecdb", 8, "wood")
    m.tube((0, 0, -0.42), (0, 0, -0.26), 0.031, 0.031, "6b4832", 9, "matte")
    m.tube((0, 0, -0.05), (0, 0, 0.05), 0.028, 0.028, "d4ac5c", 8, "metal")
    m.save("oar")
