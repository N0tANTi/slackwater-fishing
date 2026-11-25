"""Generate a rich jewel-emerald painterly lake bottom texture with seagrass beds and warm sand pockets."""

import bpy
import numpy as np


def material(mesh, obj):
    n = 1536
    rng = np.random.default_rng(6905)
    y, x = np.mgrid[0:n, 0:n] / n

    def noise(cells):
        field = rng.random((cells, cells))
        u = x * cells
        v = y * cells
        ix = u.astype(int)
        iy = v.astype(int)
        a = u - ix
        b = v - iy
        a = a * a * (3 - 2 * a)
        b = b * b * (3 - 2 * b)
        return (
            (1 - a) * (1 - b) * field[iy, ix]
            + a * (1 - b) * field[iy, (ix + 1) % cells]
            + (1 - a) * b * field[(iy + 1) % cells, ix]
            + a * b * field[(iy + 1) % cells, (ix + 1) % cells]
        )

    n8, n23, n57, n130, n310 = [noise(i) for i in (8, 23, 57, 130, 310)]
    seagrass = np.clip((n8 * 0.45 + n23 * 0.35 + n57 * 0.20 - 0.42) * 3.6, 0, 1)
    sand = np.clip((n8 * 0.50 + n23 * 0.50 - 0.55) * 3.4, 0, 1)
    pebble = np.clip((n57 * 0.30 + n130 * 0.48 + n310 * 0.22 - 0.58) * 4.4, 0, 1)
    facet = 0.74 + 0.20 * n23 + 0.14 * n130 + 0.08 * n310

    # Deep saturated jewel emerald-teal base (high contrast against orange fish & red-white boat!)
    emerald = np.array([0.028, 0.215, 0.195])
    deep_weed = np.array([0.015, 0.135, 0.132])
    warm_sand = np.array([0.135, 0.265, 0.205])
    gravel = np.array([0.175, 0.275, 0.225])

    color = emerald + (deep_weed - emerald) * seagrass[:, :, None]
    color = color + (warm_sand - color) * (sand[:, :, None] * 0.55)
    color = (color + (gravel - color) * pebble[:, :, None]) * facet[:, :, None]

    # Subtle sunlit painterly sand ripples
    ripple = np.exp(-22 * abs(np.sin(44 * np.pi * y + 3.6 * np.sin(x * 10 * np.pi) + 2.6 * n23)))
    color += ripple[:, :, None] * np.array([0.012, 0.025, 0.020])

    rgba = np.ones((n, n, 4), np.float32)
    rgba[:, :, :3] = np.clip(color, 0, 1)
    while mesh.color_attributes:
        mesh.color_attributes.remove(mesh.color_attributes[0])
    image = bpy.data.images.new("Lagoon gravel", width=n, height=n)
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    uv = mesh.uv_layers.new(name="Ground")
    for loop in mesh.loops:
        co = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x / 10, -co.y / 10)
    mat = bpy.data.materials.new("Lagoon bottom")
    mat.use_nodes = True
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.96
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
