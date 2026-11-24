"""Batch low-poly painted geometry in game coordinates (Y up), then export with Blender."""

import math
import random
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "media"
OUT.mkdir(exist_ok=True)
TAU = math.tau
rng = random.Random(6174)


def linear(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb(hexcolor, gain=1.0):
    c = hexcolor.lstrip("#")
    return tuple(min(1, linear(int(c[i : i + 2], 16) / 255) * gain) for i in (0, 2, 4)) + (1,)


class PaintedMesh:
    def __init__(self):
        self.points = []
        self.faces = []
        self.colors = []
        self.smooth = {}

    def face(self, points, color, gain=1.0):
        start = len(self.points)
        for x, y, z in points:
            self.points.append((x, -z, y))
        self.faces.append(tuple(range(start, len(self.points))))
        self.colors.append(rgb(color, gain))

    def ball(self, pos, radii, color, sides=10, bands=6, yaw=0, noise=0.0, tint=0.07):
        start = len(self.points)
        x, y, z = pos
        sx, sy, sz = radii
        rings = []
        for j in range(1, bands):
            lat = math.pi * j / bands
            row = []
            for i in range(sides):
                a = TAU * i / sides
                k = 1 + rng.uniform(-noise, noise)
                dx, dz = sx * math.sin(lat) * math.cos(a) * k, sz * math.sin(lat) * math.sin(a) * k
                row.append(
                    (
                        x + dx * math.cos(yaw) - dz * math.sin(yaw),
                        y + sy * math.cos(lat) * k,
                        z + dx * math.sin(yaw) + dz * math.cos(yaw),
                    )
                )
            rings.append(row)
        for i in range(sides):
            n = (i + 1) % sides
            self.face([(x, y + sy, z), rings[0][n], rings[0][i]], color)
            self.face([rings[-1][i], rings[-1][n], (x, y - sy, z)], color)
            for a, b in zip(rings, rings[1:]):
                self.face([a[i], a[n], b[n], b[i]], color, 1 + rng.uniform(-tint, tint))

        for idx in range(start, len(self.points)):
            px, minus_z, py = self.points[idx]
            dx, dy, dz = px - x, py - y, -minus_z - z
            c, s = math.cos(yaw), math.sin(yaw)
            local_x = (dx * c + dz * s) / max(0.00001, sx * sx)
            local_z = (-dx * s + dz * c) / max(0.00001, sz * sz)
            self.smooth[idx] = Vector(
                (local_x * c - local_z * s, -(local_x * s + local_z * c), dy / max(0.00001, sy * sy))
            ).normalized()

    def tube(self, a, b, r1, r2, color, sides=9):
        a, b = Vector(a), Vector(b)
        delta = b - a
        if delta.length < 0.00001:
            return
        direction = delta.normalized()
        ref = Vector((0, 1, 0)) if abs(direction.y) < 0.9 else Vector((1, 0, 0))
        u = direction.cross(ref).normalized()
        v = direction.cross(u)
        offsets = [u * math.cos(i * TAU / sides) + v * math.sin(i * TAU / sides) for i in range(sides)]
        bottom = [a + k * r1 for k in offsets]
        top = [b + k * r2 for k in offsets]
        self.face(bottom[::-1], color)
        self.face(top, color)
        for i in range(sides):
            n = (i + 1) % sides
            self.face([bottom[i], bottom[n], top[n], top[i]], color, 1 + rng.uniform(-0.035, 0.035))

    def path(self, points, r, color, sides=7):
        for a, b in zip(points, points[1:]):
            self.tube(a, b, r, r, color, sides)

    def box(self, center, size, color):
        x, y, z = center
        a, b, c = [i / 2 for i in size]
        p = [
            (x + u * a, y + v * b, z + w * c)
            for u, v, w in [
                (-1, -1, -1),
                (1, -1, -1),
                (1, -1, 1),
                (-1, -1, 1),
                (-1, 1, -1),
                (1, 1, -1),
                (1, 1, 1),
                (-1, 1, 1),
            ]
        ]
        for f in [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]:
            self.face([p[i] for i in f], color)

    def save(self, name, material_override=None):
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.points, [], self.faces)
        mesh.update()
        if self.smooth:
            normals = []
            for face in mesh.polygons:
                for vi in face.vertices:
                    n = self.smooth.get(vi)
                    normals.append(face.normal if n is None else n.lerp(face.normal, 0.24).normalized())
                face.use_smooth = True
            mesh.normals_split_custom_set(normals)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        attr = mesh.color_attributes.new(name="Paint", type="BYTE_COLOR", domain="CORNER")
        colors = [
            channel for face, color in zip(self.faces, self.colors) for _ in face for channel in color
        ]
        attr.data.foreach_set("color", colors)
        mesh.color_attributes.active_color = attr
        mat = bpy.data.materials.new("Painted timber and stone")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        vc = nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Paint"
        bsdf = nodes.get("Principled BSDF")
        bsdf.inputs["Roughness"].default_value = 0.81
        mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
        obj.data.materials.append(mat)
        if material_override is not None:
            material_override(mesh, obj)
        if name in ("perch", "carp", "minnow", "ray"):
            obj.shape_key_add(name="Rest")
            bend = obj.shape_key_add(name="Tail sweep")
            for v in bend.data:
                weight = min(1, max(0, (-v.co.x - 0.01) / 0.48))
                v.co.y += 0.14 * weight * weight
            bend.slider_min = -1
            for frame, value in [(1, 0), (7, 1), (13, 0), (19, -1), (25, 0)]:
                bend.value = value
                bend.keyframe_insert(data_path="value", frame=frame)
            obj.data.shape_keys.animation_data.action.name = "Swim"
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=str(OUT / (name + ".glb")),
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_attributes=False,
            export_animation_mode="ACTIONS",
        )
