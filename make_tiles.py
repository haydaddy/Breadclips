#!/usr/bin/env python3
"""
make_tiles.py - cut the master images into Deep Zoom (DZI) tiles for the viewers.

    python make_tiles.py                  rebuild every image that changed since last time
    python make_tiles.py grid2.png        rebuild just that one
    python make_tiles.py D:\\scans\\grid2.png   ...using a copy that lives somewhere else
    python make_tiles.py --all            rebuild everything
    python make_tiles.py --quality 95     (see the settings below)

Each image in VIEWERS gets its own page on the site. For every image this
    1. reads the master image (any size; it is streamed, not loaded whole),
    2. writes the tile pyramid to <folder>/tiles/breadclips.dzi + breadclips_files/,
    3. writes <folder>/tiles/manifest.js, which tells the page the image size and
       gives this build a version stamp so browsers never mix old and new tiles,
    4. creates <folder>/index.html if the page does not exist yet.

The old tiles are only replaced once the new ones are complete, so a failed
run leaves the working site untouched.

Needs: pyvips  (pip install -r requirements.txt)
"""

import argparse
import html
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# ----------------------------------------------------------------------------
# The images on the site
# ----------------------------------------------------------------------------
# master image (next to this script)  ->  (folder of its page, title of its page)
# Folder "" is the front page of the site, https://haydaddy.github.io/Breadclips/
# Folder "grid2" becomes             https://haydaddy.github.io/Breadclips/grid2/
# To add another image, add a line here and run this script.
VIEWERS = {
    "grid.png":  ("",      "Bread clip collection"),
    "grid2.png": ("grid2", "Bread clip collection 2"),
}

# ----------------------------------------------------------------------------
# Tile settings (the same for every image)
# ----------------------------------------------------------------------------
NAME = "breadclips"     # tiles/<NAME>.dzi and tiles/<NAME>_files/
TILE_SIZE = 512         # pixels; 512 keeps the file count low without big downloads
OVERLAP = 1             # pixels shared between neighbouring tiles (hides seams)
FORMAT = "jpg"          # jpg, webp or png (png = lossless, but several times larger)
QUALITY = 92            # jpg / webp quality, 1-100
BACKGROUND = (0, 0, 0)  # what transparent areas become, R G B

HERE = Path(__file__).resolve().parent

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="icon" type="image/png" href="{up}favicon.png">
<link rel="stylesheet" href="{up}viewer/viewer.css">
</head>
<body>
<!-- Everything on this page comes from viewer/viewer.js; the image is the one in tiles/ next to it. -->
<div id="viewer"></div>
<noscript><div id="message" class="error">This viewer needs JavaScript.</div></noscript>
<script src="tiles/manifest.js"></script>
<script src="{up}vendor/openseadragon/openseadragon.min.js"></script>
<script src="{up}viewer/viewer.js"></script>
</body>
</html>
"""


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


def source_stamp(src):
    st = src.stat()
    return {"file": src.name, "bytes": st.st_size, "modified": int(st.st_mtime)}


def read_manifest(tiles_dir):
    """The manifest of the current tiles, or None."""
    try:
        text = (tiles_dir / "manifest.js").read_text(encoding="utf-8")
        return json.loads(text[text.index("=") + 1:text.rindex(";")])
    except (OSError, ValueError):
        return None


def build(src, folder, title, args, pyvips):
    page_dir = HERE / folder
    out = page_dir / "tiles"
    tmp = page_dir / "tiles.new"
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

    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    image.dzsave(str(tmp / NAME),
                 layout="dz",
                 suffix=save_options(args.format, args.quality),
                 tile_size=args.tile_size,
                 overlap=OVERLAP,
                 depth="onepixel")
    print("\rcutting tiles ... done ")

    files_dir = tmp / f"{NAME}_files"
    for junk in files_dir.glob("vips-properties.xml"):
        junk.unlink()
    tiles = [p for p in files_dir.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in tiles) + (tmp / f"{NAME}.dzi").stat().st_size
    biggest = max(p.stat().st_size for p in tiles)

    manifest = {
        "name": NAME,
        "version": datetime.now().strftime("%Y%m%d-%H%M%S"),
        "width": image.width,
        "height": image.height,
        "tileSize": args.tile_size,
        "overlap": OVERLAP,
        "format": args.format,
        "source": source_stamp(src),
    }
    (tmp / "manifest.js").write_text(
        "// Written by make_tiles.py - do not edit, it is replaced on every run.\n"
        f"window.TILE_MANIFEST = {json.dumps(manifest, indent=2)};\n",
        encoding="utf-8")

    # swap the finished build in
    if out.exists():
        shutil.rmtree(out)
    tmp.rename(out)

    page = page_dir / "index.html"
    if not page.exists():
        up = "../" * len(Path(folder).parts)
        page.write_text(PAGE.format(title=html.escape(title), up=up), encoding="utf-8")
        print(f"page   : created {page.relative_to(HERE)}")

    print(f"wrote  : {len(tiles)} tiles, {total / 1e6:.1f} MB in {out.relative_to(HERE)}/"
          f"  (largest tile {biggest / 1e3:.0f} kB)")
    print(f"version: {manifest['version']}")
    print(f"time   : {time.time() - started:.0f} s")
    return total


def main():
    ap = argparse.ArgumentParser(description="Build Deep Zoom tiles for the bread clip viewers.")
    ap.add_argument("sources", nargs="*",
                    help="master image(s) to rebuild, matched by file name (default: every one that changed)")
    ap.add_argument("--all", action="store_true", help="rebuild every image, changed or not")
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

    # work out what to build: [(master path, folder, title, forced)]
    jobs = []
    if args.sources:
        for s in args.sources:
            src = Path(s).expanduser()
            if not src.is_file() and (HERE / s).is_file():
                src = HERE / s
            if not src.is_file():
                raise SystemExit(f"master image not found: {s}")
            match = next((k for k in VIEWERS if k.lower() == src.name.lower()), None)
            if match is None:
                raise SystemExit(f"{src.name} is not in the VIEWERS list at the top of make_tiles.py.\n"
                                 f"Known images: {', '.join(VIEWERS)}. Add a line there for a new image.")
            jobs.append((src.resolve(), *VIEWERS[match], True))
    else:
        for name, (folder, title) in VIEWERS.items():
            src = HERE / name
            if src.is_file():
                jobs.append((src, folder, title, args.all))
            else:
                print(f"{name}: not found next to make_tiles.py - skipped\n")

    built, total = 0, 0
    for src, folder, title, forced in jobs:
        where = f"{folder}/" if folder else "front page"
        current = read_manifest(HERE / folder / "tiles")
        unchanged = (current is not None and current.get("source") == source_stamp(src)
                     and current.get("format") == args.format and current.get("tileSize") == args.tile_size)
        if unchanged and not forced:
            print(f"== {src.name} -> {where}: unchanged since the last build, skipped\n")
            continue
        print(f"== {src.name} -> {where}")
        total += build(src, folder, title, args, pyvips)
        built += 1
        print()

    if not built:
        print("Nothing to do. (Use --all to rebuild anyway.)")
        return
    if total > 900e6:
        print("WARNING: the tiles are close to (or over) the 1 GB GitHub Pages limit.\n"
              "         Lower --quality or use --format webp.\n")
    print("Next: check the result with preview.bat, then commit and push in\n"
          "GitHub Desktop (see README.md, 'Updating an image').")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nstopped - the existing tiles were not changed")
