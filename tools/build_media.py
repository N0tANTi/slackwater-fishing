"""Run in Blender background to regenerate every game asset from source."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from boat import hull, fisher, oar
from lagoon import lagoon, fish, ray
from sound import soundscape
from otter import companion
from ripple import ripple_map

hull()
oar()
for pose in ("rest", "cast", "hold"):
    fisher(pose)
fish("perch", "9bb658", "c18844", "587648")
fish("carp", "efa542", "ce7134", "e4bd58")
fish("minnow", "72aeb1", "6d919d", "517e8b")
ray()
companion()
ripple_map()
lagoon()
soundscape()
from shutil import copyfile
from geometry import OUT

copyfile(Path(__file__).resolve().parents[1] / "shaders" / "lagoon.wesl", OUT / "lagoon.wesl")
