"""Run in Blender background to regenerate every game asset from source."""

from pathlib import Path
from shutil import copyfile
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from boat import hull, fisher, oar
from lagoon import lagoon, fish, ray
from sound import soundscape
from otter import companion
from ripple import ripple_map
from geometry import OUT

hull()
oar()
for pose in ("rest", "cast", "hold", "row"):
    fisher(pose)

# (name, dorsal_top, mid_flank, belly, fin, stripes_or_accent)
fish("perch", "5e8e42", "a8cf5c", "eef2be", "df7634", "345a32")
fish("carp", "ee8728", "f8bd3f", "fff4cc", "f28a2e", "ffe070")
fish("koi", "f25c26", "f88738", "fff4e2", "f8b25a", "fff8ec")
fish("minnow", "2994a8", "46bed0", "dcf6f4", "f0c24b", "2a8599")

ray()
companion()
ripple_map()
lagoon()
soundscape()

copyfile(Path(__file__).resolve().parents[1] / "shaders" / "lagoon.wesl", OUT / "lagoon.wesl")
