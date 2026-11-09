# Bread clip viewer

Web pages that show the bread clip grids as smooth, scrollable images that
visitors can zoom into right down to the detail of the scans. They are hosted
for free on GitHub Pages and embedded in the Wikidot site with `[[iframe]]`.

There is one page per image, each with its own address:

| Image | Address |
| --- | --- |
| `grid.png` | <https://haydaddy.github.io/Breadclips/> |
| `grid2.png` | <https://haydaddy.github.io/Breadclips/grid2/> |

**Contents**

1. [How it works](#1-how-it-works)
2. [What is in this folder](#2-what-is-in-this-folder)
3. [Try it on your computer](#3-try-it-on-your-computer)
4. [Publish to GitHub Pages](#4-publish-to-github-pages)
5. [Embed it in Wikidot](#5-embed-it-in-wikidot)
6. [Updating an image](#6-updating-an-image)
7. [Adding another image](#7-adding-another-image)
8. [Controls](#8-controls)
9. [Settings you can change](#9-settings-you-can-change)
10. [Limits worth knowing](#10-limits-worth-knowing)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. How it works

The master images are far too big to put on a web page as they are:

| Image | Size | File |
| --- | --- | --- |
| `grid.png` | 3,612 × 82,080 pixels (296 megapixels) | 225 MB |
| `grid2.png` | 9,060 × 11,733 pixels (106 megapixels) | 43 MB |

No browser can comfortably load pictures that size, and most phones cannot
open them at all. So each image is cut into **tiles** - small 512-pixel
squares - the same way online maps work:

- The full-size image is cut into tiles.
- Then the image is shrunk to half size and cut again, then to a quarter, and
  so on down to a single pixel. These are the **levels** of the pyramid.
- The viewer only downloads the handful of tiles that are on screen, at the
  level that matches the current zoom - for `grid.png` fitted to width on a
  normal monitor that is roughly 15 small files, not 225 MB.

| Image | Levels | Tiles | Size of all tiles |
| --- | --- | --- | --- |
| `grid.png` | 18 | 1,747 | 86 MB |
| `grid2.png` | 15 | 575 | 15 MB |

This format is called **Deep Zoom** (DZI). Two tools do the work:

| Tool | Job |
| --- | --- |
| **pyvips** (Python) | cuts the master images into tiles - `make_tiles.py` |
| **OpenSeadragon** (JavaScript) | shows the tiles in the browser - `viewer/viewer.js` |

Nothing runs on a server. The site is only files, which is why free static
hosting like GitHub Pages is enough.

---

## 2. What is in this folder

| File / folder | What it is | On GitHub? |
| --- | --- | --- |
| `index.html` | the page for `grid.png` (the front page of the site) | yes |
| `tiles/` | the tiles of `grid.png` - **generated**, never edit by hand | yes |
| `grid2/index.html` | the page for `grid2.png` | yes |
| `grid2/tiles/` | the tiles of `grid2.png` - **generated** | yes |
| `viewer/viewer.js` | the viewer itself, shared by every page | yes |
| `viewer/viewer.css` | how the viewer looks, shared by every page | yes |
| `vendor/openseadragon/` | OpenSeadragon 6.1.1, included so the site depends on no other website | yes |
| `make_tiles.py` | rebuilds the tiles from the master images, and makes pages for new ones | yes |
| `make_tiles.bat` | the same, as a double-click | yes |
| `preview.bat` | shows the site on your own computer | yes |
| `requirements.txt` | what `make_tiles.py` needs installed | yes |
| `.nojekyll` | tells GitHub Pages to publish the files exactly as they are | yes |
| `.gitignore` | tells Git which files to leave out | yes |
| `grid.png`, `grid2.png` | the master images | **no** - see below |

Inside each `tiles/` folder:

| File | What it is |
| --- | --- |
| `breadclips.dzi` | standard Deep Zoom description of the image |
| `breadclips_files/` | the tiles, one folder per level (the highest number = full size) |
| `manifest.js` | image size, version stamp and which master it came from |

The master images stay on your computer. GitHub refuses any file over 100 MB
(`grid.png` is 225 MB), and the website does not use them - only the tiles made
from them. `.gitignore` keeps every `grid….png` in this folder out
automatically.

Each page (`index.html`, `grid2/index.html`) is only a few lines long: it names
its title and loads the shared viewer, which reads the tiles in the `tiles/`
folder next to the page. A change to `viewer/viewer.js` or `viewer.css`
therefore changes every page at once.

---

## 3. Try it on your computer

Double-click **`preview.bat`**. A browser tab opens at `http://127.0.0.1:8000/`
showing the front page exactly as it will look online; the second image is at
`http://127.0.0.1:8000/grid2/`. Close the black window when you are finished.

(Opening an `index.html` directly by double-clicking it may also work, but
some browsers restrict pages opened straight from disk, so `preview.bat` is
the reliable way.)

---

## 4. Publish to GitHub Pages

The site already lives in the GitHub repository **haydaddy/Breadclips**, with
GitHub Pages switched on. Publishing a change is:

1. Open **GitHub Desktop**. The changed files are listed on the left.
2. Type a short note in the **Summary** box (for example `add grid2`).
3. Click **Commit to main**, then **Push origin**.
4. Wait a minute or two. In the repository on github.com, the **Actions** tab
   shows a green tick when "pages build and deployment" has finished.

### Setting it up again from scratch

Only needed if you ever start a new repository (see section 10).

1. In GitHub Desktop: **File → Add local repository…**, pick this folder. If
   it says the folder is not a repository, click **create a repository** and
   then **Create repository**.
2. Click **Publish repository**. Name it `Breadclips` (the name is part of the
   web address) and **untick "Keep this code private"** - on a free account
   GitHub Pages only works for public repositories.
3. On github.com: the repository → **Settings → Pages** → Source
   *Deploy from a branch*, Branch `main`, folder `/ (root)` → **Save**.

---

## 5. Embed it in Wikidot

Put each viewer on its own Wikidot page with one of these lines:

```
[[iframe https://haydaddy.github.io/Breadclips/ width="100%" height="800" frameborder="0" scrolling="no" style="width:100%; height:85vh; border:0;"]]
```

```
[[iframe https://haydaddy.github.io/Breadclips/grid2/ width="100%" height="800" frameborder="0" scrolling="no" style="width:100%; height:85vh; border:0;"]]
```

To create a new Wikidot page, type its address in the browser, for example
`diversityofbreadclips.wikidot.com/collection-2`, and click *create page*.

What each part does:

| Part | Meaning |
| --- | --- |
| `https://…/Breadclips/grid2/` | the address of the viewer (keep the `/` at the end) |
| `width="100%"` | as wide as the page column |
| `height="800"` | 800 pixels tall - used only if the `style` is ever ignored |
| `frameborder="0"` | no border line around it |
| `scrolling="no"` | no second scrollbar; the viewer does its own scrolling |
| `style="… height:85vh …"` | 85 % of the height of the visitor's window |

### Making the viewer fill the whole Wikidot page

Wikidot puts a header, a side menu and a page title around every page, so the
viewer only gets the middle column. To give it the whole window, add this
above the `[[iframe …]]` line on that page:

```
[[module CSS]]
#header, #side-bar, #page-title { display: none; }
#main-content { margin: 0; padding: 0; }
#page-content p { margin: 0; }
#page-content iframe { display: block; width: 100%; height: 100vh !important; }
[[/module]]
```

It only affects the page it is on. The Edit / History buttons and the footer
are still there, just below the viewer - reach them with the browser's
scrollbar on the right.

Good to know:

- **Scrolling hands over at the ends.** While the mouse is over the viewer the
  wheel scrolls the clips. At the very top (scrolling up) or the very bottom
  (scrolling down) the wheel scrolls the Wikidot page again, so nobody gets
  stuck inside the frame.
- **On phones** a finger on the viewer always moves the clips, never the page.
  Keep the frame a bit shorter than the screen (the `85vh` version does this)
  so there is always a strip of page left to grab.
- **Full screen** is not possible inside a Wikidot iframe (Wikidot does not
  allow the permission it needs). The viewer notices and shows an
  *open in a new tab* button there instead.

---

## 6. Updating an image

When you have a new version of `grid.png` or `grid2.png`:

1. **Put the new file in this folder**, replacing the old one (same name).
2. **Double-click `make_tiles.bat`.** It rebuilds only the images that changed
   since the last run and skips the rest:

   ```
   == grid.png -> front page: unchanged since the last build, skipped

   == grid2.png -> grid2/
   ...
   wrote  : 575 tiles, 15.0 MB in grid2\tiles/  (largest tile 127 kB)
   ```

   The first time ever, it installs pyvips by itself.
3. **Check it** with `preview.bat`.
4. **Publish it** as in [section 4](#4-publish-to-github-pages).
5. After a minute or two the website and the Wikidot pages show the new image.
   Nothing on Wikidot needs to change.

Things the script takes care of:

- **The image can change size.** More rows, a different width - the viewer
  reads the size from `manifest.js`, which is rewritten every time.
- **No stale tiles.** Every build gets a new version stamp that is added to
  each tile's address, so a visitor's browser can never mix old and new tiles.
- **Safe to interrupt.** The new tiles are built in a temporary `tiles.new`
  folder and only swapped in when complete. If something fails, the existing
  tiles are untouched.

From a command prompt:

```
python make_tiles.py                         (every image that changed)
python make_tiles.py grid2.png               (just this one, changed or not)
python make_tiles.py D:\imageforclaude\grid2.png   (a copy kept somewhere else; matched by its name)
python make_tiles.py --all                   (everything)
python make_tiles.py --all --quality 95      (see section 9)
```

You can also drag a `grid….png` from anywhere onto `make_tiles.bat`.

---

## 7. Adding another image

Say you have `grid3.png`:

1. Put `grid3.png` in this folder.
2. Open `make_tiles.py` in Notepad. Near the top is the list of images; add a
   line for the new one:

   ```python
   VIEWERS = {
       "grid.png":  ("",      "Bread clip collection"),
       "grid2.png": ("grid2", "Bread clip collection 2"),
       "grid3.png": ("grid3", "Bread clip collection 3"),
   }
   ```

   The middle part is the folder, which becomes the end of the web address
   (`…/Breadclips/grid3/`); use lower-case letters, digits and `-` only. The
   last part is the page title shown on the browser tab.
3. Double-click `make_tiles.bat`. It cuts the tiles **and** creates
   `grid3/index.html`.
4. Check with `preview.bat` (`http://127.0.0.1:8000/grid3/`), publish as in
   section 4, and embed `https://haydaddy.github.io/Breadclips/grid3/` in
   Wikidot as in section 5.

To change a page's title later, edit the `<title>` line in its `index.html`.

---

## 8. Controls

| To do this | Mouse / keyboard | Trackpad | Touch screen |
| --- | --- | --- | --- |
| Scroll through the clips | mouse wheel, or drag | two-finger scroll | drag (flick to coast) |
| Zoom | **Ctrl + wheel**, `+` / `-`, the buttons, double-click | pinch | pinch, double-tap |
| Move sideways when zoomed in | drag, Shift + wheel, `←` `→` | two-finger scroll | drag |
| Jump a screen | `Page Down` / `Page Up`, `Space` / `Shift+Space` | | |
| Jump to the start / end | `Home` / `End` | | |
| Jump anywhere (long images) | click or drag in the navigator strip | same | tap the strip |
| Back to fit-to-width | `0`, or the ↔ button | | ↔ button |

Every page opens fitted to the width of the window, at the top. The rest
depends on the shape of the image:

- **Long strips** like `grid.png` - the strip down the right edge is the
  **navigator**: a miniature of the whole image with a yellow box marking the
  part on screen. Zooming out stops at fit-to-width (any further and the clips
  would be specks).
- **Other images** like `grid2.png` - no navigator, so nothing covers the
  clips. Instead you can zoom out until the whole image fits on screen, which
  gives the same overview.

The switch-over point is `LONG_IMAGE` in section 9.

---

## 9. Settings you can change

### Tile settings - top of `make_tiles.py`

| Setting | Default | What it does |
| --- | --- | --- |
| `VIEWERS` | two images | which master images become which pages (section 7) |
| `QUALITY` | `92` | JPEG quality. Higher = larger files, see the table below |
| `FORMAT` | `"jpg"` | `jpg`, `webp` or `png` |
| `TILE_SIZE` | `512` | tile size in pixels. Smaller means many more files |
| `BACKGROUND` | `(0, 0, 0)` | colour that replaces transparency, if a master has any |

These apply to every image. After changing one, run `make_tiles.py --all`.

Sizes measured on `grid.png`:

| Setting | Total size | Notes |
| --- | --- | --- |
| jpg, quality 85 | 63 MB | smallest jpg option |
| jpg, quality 90 | 78 MB | |
| **jpg, quality 92** | **86 MB** | **default** |
| jpg, quality 95 | 112 MB | costs more per update (section 10) |
| webp, quality 92 | 45 MB | half the size; takes about 25 s to build instead of 5 |
| png | not measured, expect 300 MB or more | truly lossless, but slow to load - not recommended |

How close is the default to the original? Comparing full-size tiles with the
same area of `grid.png`, pixel values differ by 0.7 on average on the 0-255
scale - well below what an eye can see. The tiles are also saved with full
colour detail (no "chroma subsampling"), which keeps the edges of coloured
clips crisp against the black background.

### Viewer settings - the `Settings` block at the top of `viewer/viewer.js`

These apply to every page.

| Setting | Default | What it does |
| --- | --- | --- |
| `MAX_ZOOM` | `2` | how far in you can zoom. `2` = each scan pixel shown twice as large |
| `WHEEL_SMOOTHING` | `90` | how softly a mouse-wheel step glides. `0` = instant, `150` = floaty |
| `ZOOM_STEP` | `1.5` | how much one press of `+` / `-` zooms |
| `ARROW_STEP` | `120` | pixels moved per arrow-key press |
| `PRELOAD_SCREENS` | `1` | how many screens ahead are downloaded early while scrolling. `0` = off |
| `LONG_IMAGE` | `3` | images at least this many times taller than wide count as long strips (section 8) |

Colours and the width of the right-hand strip are in the `:root { … }` block
at the top of `viewer/viewer.css`.

---

## 10. Limits worth knowing

| GitHub limit | Value | Where this project stands |
| --- | --- | --- |
| Largest single file | 100 MB | biggest tile is under 0.2 MB. `grid.png` is over, which is why it is not uploaded |
| Published site size | 1 GB | about 101 MB (86 + 15) |
| Traffic | 100 GB per month (soft) | scrolling through all of `grid.png` at fit-to-width downloads about 20 MB in a normal window, about 53 MB on very large or high-density screens |
| Repository size | keep under about 1 GB | **grows with every update - read on** |

**The repository remembers every version.** Git keeps the old tiles each time
you publish new ones, so updating an image adds roughly the size of its tiles
to the repository (about 86 MB for `grid.png`, 15 MB for `grid2.png`), even
though the website itself stays the same size. Images that did not change cost
nothing: `make_tiles.bat` skips them, and even a forced rebuild produces
identical files that Git does not store twice. After the repository passes
about 1 GB it is worth starting fresh:

1. On github.com: repository → **Settings** → scroll to the bottom →
   **Delete this repository**.
2. In this folder, delete the hidden `.git` folder (turn on *View → Hidden
   items* in File Explorer to see it).
3. Follow *Setting it up again from scratch* in section 4 using the **same
   name**. The addresses stay the same, so the Wikidot pages keep working.

Using `webp` tiles (section 9) halves how fast it grows.

---

## 11. Troubleshooting

**The page says "No tiles found".**
The `tiles/` folder next to that page is missing. Run `make_tiles.bat`.

**The website still shows the old image after an update.**
Give GitHub two or three minutes, then reload. In the repository on github.com
the **Actions** tab shows whether the "pages build and deployment" has
finished (green tick). Also check that you clicked **Push origin** in GitHub
Desktop, not only **Commit**.

**An address shows a GitHub 404 page.**
Check the spelling: the folder part is case-sensitive (`/Breadclips/grid2/`,
not `/Breadclips/Grid2/`). For a new image, check that its folder was
committed and pushed.

**`make_tiles.bat` says an image "is not in the VIEWERS list".**
The file name does not match a line in `VIEWERS` at the top of
`make_tiles.py` - see section 7.

**`make_tiles.bat` says an image is unchanged but you replaced it.**
It compares file size and date. Run `python make_tiles.py grid2.png` (or drag
the file onto `make_tiles.bat`) to force that image.

**The Wikidot frame is empty.**
Open the `github.io` address by itself first. If that works, compare the
`[[iframe …]]` line with section 5 - the address must start with `https://`
and end with `/`.

**`make_tiles.bat` says Python was not found.**
Install Python from <https://www.python.org> and tick *Add python.exe to PATH*
in the installer.

**`make_tiles.bat` cannot install pyvips.**
Run `python -m pip install --upgrade pip` in a command prompt and try again.
The line it runs is `python -m pip install -r requirements.txt`.

**GitHub Desktop refuses to push because a file is too large.**
A big image got included. Master images named `grid….png` in this folder are
left out automatically; add any other large file's name to `.gitignore`, or
keep it outside this folder.

**Scrolling zooms instead (or the other way round).**
Plain wheel = scroll, **Ctrl + wheel** = zoom. A pinch on a trackpad zooms.

---

### Credits

- [OpenSeadragon](https://openseadragon.github.io/) 6.1.1 - BSD 3-Clause
  licence, included in `vendor/openseadragon/`.
- [libvips](https://www.libvips.org/) via
  [pyvips](https://github.com/libvips/pyvips) - used to cut the tiles.
