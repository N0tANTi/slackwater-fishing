"""Generate the painted lake bottom as a tileable, world-space colour texture."""

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
    undergrowth = np.clip((n8 * 0.42 + n23 * 0.36 + n57 * 0.22 - 0.43) * 3.5, 0, 1)
    stone = np.clip((n57 * 0.32 + n130 * 0.48 + n310 * 0.20 - 0.57) * 4, 0, 1)
    facet = 0.69 + 0.25 * n23 + 0.15 * n130 + 0.12 * n310
    silt = np.array([0.071, 0.229, 0.213])
    weed = np.array([0.043, 0.159, 0.155])
    gravel = np.array([0.22, 0.302, 0.265])
    color = silt + (weed - silt) * undergrowth[:, :, None]
    color = (color + (gravel - color) * stone[:, :, None]) * facet[:, :, None]
    # Hairline deposits in the sand make the bottom read through a still spot in the water.
    ripple = np.exp(-22 * abs(np.sin(52 * np.pi * y + 4 * np.sin(x * 12 * np.pi) + 3 * n23)))
    color += ripple[:, :, None] * np.array([0.009, 0.014, 0.011])
    rgba = np.ones((n, n, 4), np.float32)
    rgba[:, :, :3] = color
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
    bsdf.inputs["Roughness"].default_value = 1
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
