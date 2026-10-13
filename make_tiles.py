#!/usr/bin/env python3
"""
make_tiles.py - cut the master image into Deep Zoom (DZI) tiles for the viewer.

    python make_tiles.py                 uses grid.png next to this script
    python make_tiles.py path\\to\\grid.png
    python make_tiles.py --quality 95

What it does
    1. Reads the master image (any size; it is streamed, not loaded whole).
    2. Writes the tile pyramid to tiles/breadclips.dzi + tiles/breadclips_files/.
    3. Writes tiles/manifest.js, which tells index.html the image size and gives
       this build a version stamp so browsers never mix old and new tiles.

The old tiles/ folder is only replaced once the new one is complete, so a
failed run leaves the working site untouched.

Needs: pyvips  (pip install -r requirements.txt)
"""

import argparse
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# ----------------------------------------------------------------------------
# Settings
# ----------------------------------------------------------------------------
SOURCE = "grid.png"     # master image, relative to this script
NAME = "breadclips"     # tiles/<NAME>.dzi and tiles/<NAME>_files/
TILE_SIZE = 512         # pixels; 512 keeps the file count low without big downloads
OVERLAP = 1             # pixels shared between neighbouring tiles (hides seams)
FORMAT = "jpg"          # jpg, webp or png (png = lossless, but several times larger)
QUALITY = 92            # jpg / webp quality, 1-100
BACKGROUND = (0, 0, 0)  # what transparent areas become, R G B

HERE = Path(__file__).resolve().parent
OUT = HERE / "tiles"
BUILD = HERE / "tiles.new"


def save_options(fmt, quality):
    """The '[...]' save options libvips applies to every tile."""
    if fmt == "jpg":
        # subsample_mode=off keeps full colour resolution (no fringes on the
        # edges of coloured clips); optimize_coding makes smaller files for free.
        return f".jpg[Q={quality},optimize_coding,subsample_mode=off,keep=none]"
    if fmt == "webp":
        return f".webp[Q={quality},effort=5,smart_subsample,keep=none]"
    if fmt == "png":
        return ".png[compression=9,keep=none]"
    raise SystemExit(f"unknown format: {fmt} (use jpg, webp or png)")


def prepare(image, pyvips):
    """Turn whatever the master is into plain 8-bit sRGB without transparency."""
    if image.get_typeof("icc-profile-data") != 0:
        try:
            image = image.icc_transform("srgb")
        except pyvips.Error:
            pass  # broken profile: use the pixel values as they are
    elif image.interpretation not in ("srgb", "b-w"):
        image = image.colourspace("srgb")
    if image.hasalpha():
        image = image.flatten(background=list(BACKGROUND))
    if image.format != "uchar":
        image = image.cast("uchar", shift=True)
    return image


def main():
    ap = argparse.ArgumentParser(description="Build Deep Zoom tiles for the bread clip viewer.")
    ap.add_argument("source", nargs="?", default=str(HERE / SOURCE),
                    help=f"master image (default: {SOURCE} next to this script)")
    ap.add_argument("--quality", type=int, default=QUALITY, help=f"jpg/webp quality (default: {QUALITY})")
    ap.add_argument("--format", default=FORMAT, choices=["jpg", "webp", "png"],
                    help=f"tile format (default: {FORMAT})")
    ap.add_argument("--tile-size", type=int, default=TILE_SIZE, help=f"tile size in pixels (default: {TILE_SIZE})")
    args = ap.parse_args()

    try:
        import pyvips
    except (ImportError, OSError) as e:
        raise SystemExit(f"pyvips is not available ({e}).\n"
                         "Install it with:  python -m pip install -r requirements.txt")

    src = Path(args.source).expanduser()
    if not src.is_file():
        raise SystemExit(f"master image not found: {src}")

    started = time.time()
    image = pyvips.Image.new_from_file(str(src), access="sequential")
    print(f"master : {src}  ({src.stat().st_size / 1e6:.0f} MB)")
    print(f"size   : {image.width} x {image.height} px  ({image.width * image.height / 1e6:.0f} megapixels)")
    print(f"tiles  : {args.tile_size} px {args.format}"
          + (f", quality {args.quality}" if args.format != "png" else ", lossless"))
    image = prepare(image, pyvips)

    # progress display
    image.set_progress(True)
    shown = [-1]

    def on_eval(_image, progress):
        if progress.percent != shown[0]:
            shown[0] = progress.percent
            print(f"\rcutting tiles ... {progress.percent:3d} %", end="", flush=True)

    image.signal_connect("eval", on_eval)

    if BUILD.exists():
        shutil.rmtree(BUILD)
    BUILD.mkdir()
    image.dzsave(str(BUILD / NAME),
                 layout="dz",
                 suffix=save_options(args.format, args.quality),
                 tile_size=args.tile_size,
                 overlap=OVERLAP,
                 depth="onepixel")
    print("\rcutting tiles ... done ")

    files_dir = BUILD / f"{NAME}_files"
    for junk in files_dir.glob("vips-properties.xml"):
        junk.unlink()
    tiles = [p for p in files_dir.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in tiles) + (BUILD / f"{NAME}.dzi").stat().st_size
    biggest = max(p.stat().st_size for p in tiles)

    manifest = {
        "name": NAME,
        "version": datetime.now().strftime("%Y%m%d-%H%M%S"),
        "width": image.width,
        "height": image.height,
        "tileSize": args.tile_size,
        "overlap": OVERLAP,
        "format": args.format,
    }
    (BUILD / "manifest.js").write_text(
        "// Written by make_tiles.py - do not edit, it is replaced on every run.\n"
        f"window.TILE_MANIFEST = {json.dumps(manifest, indent=2)};\n",
        encoding="utf-8")

    # swap the finished build in
    if OUT.exists():
        shutil.rmtree(OUT)
    BUILD.rename(OUT)

    print(f"wrote  : {len(tiles)} tiles, {total / 1e6:.1f} MB in {OUT.name}/"
          f"  (largest tile {biggest / 1e3:.0f} kB)")
    print(f"version: {manifest['version']}")
    print(f"time   : {time.time() - started:.0f} s")
    if total > 900e6:
        print("\nWARNING: the tiles are close to (or over) the 1 GB GitHub Pages limit.\n"
              "         Lower --quality or use --format jpg.")
    print("\nNext: open index.html to check the result, then commit and push the\n"
          "tiles/ folder to GitHub (see README.md, 'Updating the image').")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nstopped - the existing tiles/ folder was not changed")
