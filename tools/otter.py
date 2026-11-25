from geometry import PaintedMesh


def companion():
    m = PaintedMesh()
    # Adorable back-floating river otter: warm chestnut back in water, creamy tan tummy up, paws tucked on chest!
    m.ball((-0.06, -0.02, 0), (0.32, 0.095, 0.145), "7c5439", 16, 9, mat="fur")
    # Creamy tan belly facing skyward
    m.ball((0.02, 0.055, 0), (0.25, 0.082, 0.125), "e0bf96", 16, 9, mat="matte")
    # Cute head tilted cheerfully upward
    m.ball((0.25, 0.105, 0), (0.145, 0.125, 0.138), "82593d", 16, 9, mat="fur")
    m.ball((0.30, 0.155, 0), (0.095, 0.068, 0.106), "e5cba6", 12, 7, mat="matte")
    # Glossy button nose pointing slightly up
    m.ball((0.35, 0.212, 0), (0.032, 0.026, 0.032), "24201c", 10, 6, mat="wet")
    for sign in [-1, 1]:
        # Round little ears
        m.ball((0.20, 0.145, 0.118 * sign), (0.042, 0.044, 0.032), "744d35", 10, 6, mat="matte")
        # Bright eyes looking up toward the sky & fisherman
        m.ball((0.275, 0.202, 0.072 * sign), (0.019, 0.018, 0.019), "1d1b18", 10, 6, mat="wet")
        m.ball((0.282, 0.215, 0.078 * sign), (0.006, 0.005, 0.006), "fff8e8", 6, 4, mat="glass")
        # Front paws tucked adorably on its creamy chest!
        m.ball((0.12, 0.125, sign * 0.072), (0.072, 0.042, 0.048), "65442e", 10, 6, mat="fur")
        # Hind flippers gently paddling out back
        m.ball((-0.34, 0.022, sign * 0.115), (0.115, 0.036, 0.058), "5e402c", 10, 6, mat="fur")
        # Delicate otter whiskers
        m.tube((0.33, 0.185, sign * 0.072), (0.34, 0.192, sign * 0.158), 0.0035, 0.0018, "f0dfc4", 4, "matte")
        m.tube((0.34, 0.165, sign * 0.070), (0.36, 0.162, sign * 0.152), 0.0035, 0.0018, "f0dfc4", 4, "matte")
    # Tail trailing softly behind
    m.tube((-0.32, -0.01, 0), (-0.54, -0.015, 0.035), 0.062, 0.034, "734e36", 10, "fur")
    m.tube((-0.54, -0.015, 0.035), (-0.69, 0.005, 0.095), 0.034, 0.008, "69452e", 8, "fur")
    m.save("otter")
