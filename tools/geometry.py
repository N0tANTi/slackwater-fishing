"""Batch low-poly painted geometry in game coordinates (Y up), with multi-material PBR slots."""

import math
import random
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "media"
OUT.mkdir(exist_ok=True)
TAU = math.tau
rng = random.Random(6174)

MATERIAL_SPECS = {
    "matte": {"roughness": 0.86, "metallic": 0.0, "coat": 0.0, "coat_rough": 0.4, "emit": 0.0},
    "stone": {"roughness": 0.80, "metallic": 0.0, "coat": 0.05, "coat_rough": 0.48, "emit": 0.0},
    "fur": {"roughness": 0.54, "metallic": 0.0, "coat": 0.20, "coat_rough": 0.36, "emit": 0.0},
    "wood": {"roughness": 0.58, "metallic": 0.0, "coat": 0.12, "coat_rough": 0.38, "emit": 0.0},
    "metal": {"roughness": 0.30, "metallic": 0.86, "coat": 0.10, "coat_rough": 0.25, "emit": 0.0},
    "wet": {"roughness": 0.30, "metallic": 0.03, "coat": 0.62, "coat_rough": 0.18, "emit": 0.0},
    "fin": {"roughness": 0.38, "metallic": 0.0, "coat": 0.32, "coat_rough": 0.25, "emit": 0.0},
    "skin": {"roughness": 0.68, "metallic": 0.0, "coat": 0.04, "coat_rough": 0.42, "emit": 0.0},
    "foliage": {"roughness": 0.74, "metallic": 0.0, "coat": 0.06, "coat_rough": 0.45, "emit": 0.0},
    "glass": {"roughness": 0.14, "metallic": 0.0, "coat": 0.90, "coat_rough": 0.08, "emit": 0.35},
}


def linear(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb(hexcolor, gain=1.0):
    c = hexcolor.lstrip("#")
    return tuple(min(1.0, linear(int(c[i : i + 2], 16) / 255) * gain) for i in (0, 2, 4)) + (1.0,)


def _build_material(slot_name):
    spec = MATERIAL_SPECS.get(slot_name, MATERIAL_SPECS["matte"])
    mat = bpy.data.materials.new(f"Paint_{slot_name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    vc = nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Paint"
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = spec["roughness"]
    bsdf.inputs["Metallic"].default_value = spec["metallic"]
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = spec["coat"]
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = spec["coat_rough"]
    mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    if spec["emit"] > 0 and "Emission Color" in bsdf.inputs and "Emission Strength" in bsdf.inputs:
        mat.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = spec["emit"]
    return mat


class PaintedMesh:
    def __init__(self):
        self.points = []
        self.faces = []
        self.colors = []
        self.face_mats = []
        self.smooth = {}

    def face(self, points, color, gain=1.0, mat="matte"):
        start = len(self.points)
        for x, y, z in points:
            self.points.append((x, -z, y))
        self.faces.append(tuple(range(start, len(self.points))))
        self.colors.append(rgb(color, gain))
        self.face_mats.append(mat)

    def ball(self, pos, radii, color, sides=10, bands=6, yaw=0, noise=0.0, tint=0.07, mat="matte"):
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
            self.face([(x, y + sy, z), rings[0][n], rings[0][i]], color, 1.0, mat)
            self.face([rings[-1][i], rings[-1][n], (x, y - sy, z)], color, 1.0, mat)
            for a, b in zip(rings, rings[1:]):
                self.face([a[i], a[n], b[n], b[i]], color, 1 + rng.uniform(-tint, tint), mat)

        for idx in range(start, len(self.points)):
            px, minus_z, py = self.points[idx]
            dx, dy, dz = px - x, py - y, -minus_z - z
            c, s = math.cos(yaw), math.sin(yaw)
            local_x = (dx * c + dz * s) / max(0.00001, sx * sx)
            local_z = (-dx * s + dz * c) / max(0.00001, sz * sz)
            self.smooth[idx] = Vector(
                (local_x * c - local_z * s, -(local_x * s + local_z * c), dy / max(0.00001, sy * sy))
            ).normalized()

    def tube(self, a, b, r1, r2, color, sides=9, mat="matte", cap=True):
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
        if cap:
            self.face(bottom[::-1], color, 1.0, mat)
            self.face(top, color, 1.0, mat)
        for i in range(sides):
            n = (i + 1) % sides
            self.face([bottom[i], bottom[n], top[n], top[i]], color, 1 + rng.uniform(-0.03, 0.03), mat)

    def path(self, points, r, color, sides=7, mat="matte"):
        for a, b in zip(points, points[1:]):
            self.tube(a, b, r, r, color, sides, mat)

    def box(self, center, size, color, mat="matte"):
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
            self.face([p[i] for i in f], color, 1.0, mat)

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
                    normals.append(face.normal if n is None else n.lerp(face.normal, 0.20).normalized())
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

        used_slots = []
        slot_index = {}
        for slot_name in self.face_mats:
            if slot_name not in slot_index:
                slot_index[slot_name] = len(used_slots)
                used_slots.append(slot_name)
                obj.data.materials.append(_build_material(slot_name))
        for poly, slot_name in zip(mesh.polygons, self.face_mats):
            poly.material_index = slot_index[slot_name]

        if material_override is not None:
            material_override(mesh, obj)

        if name in ("perch", "carp", "koi", "minnow", "ray"):
            obj.shape_key_add(name="Rest")
            bend = obj.shape_key_add(name="Tail sweep")
            for v in bend.data:
                weight = min(1.0, max(0.0, (-v.co.x - 0.01) / 0.48))
                v.co.y += 0.14 * weight * weight
            bend.slider_min = -1.0
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
