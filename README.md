# Bread clip viewer

A web page that shows the whole bread clip grid as one long, smooth scroll, and
lets visitors zoom in to the full detail of the scans. It is built to be hosted
for free on GitHub Pages and embedded in the Wikidot site with an `[[iframe]]`.

**Contents**

1. [How it works](#1-how-it-works)
2. [What is in this folder](#2-what-is-in-this-folder)
3. [Try it on your computer](#3-try-it-on-your-computer)
4. [Put it on GitHub Pages](#4-put-it-on-github-pages)
5. [Embed it in Wikidot](#5-embed-it-in-wikidot)
6. [Updating the image](#6-updating-the-image)
7. [Controls](#7-controls)
8. [Settings you can change](#8-settings-you-can-change)
9. [Limits worth knowing](#9-limits-worth-knowing)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. How it works

The master image, `grid.png`, is 3,612 × 82,080 pixels (296 megapixels, 225 MB).
No browser can comfortably load that as one picture, and most phones cannot
open it at all.

So the image is cut into **tiles** - small 512-pixel squares - the same way
online maps work:

- The full-size image is cut into 1,288 tiles.
- Then the image is shrunk to half size and cut again (324 tiles), then to a
  quarter (82 tiles), and so on down to a single pixel. These are the
  **levels** of the pyramid: 18 of them, 1,747 tiles and about 86 MB in total.
- The viewer only downloads the handful of tiles that are on screen, at the
  level that matches the current zoom. Fitted to width on a normal monitor
  that is roughly 15 small files, not 225 MB.

This format is called **Deep Zoom** (DZI). Two tools do the work:

| Tool | Job |
| --- | --- |
| **pyvips** (Python) | cuts `grid.png` into tiles - `make_tiles.py` |
| **OpenSeadragon** (JavaScript) | shows the tiles in the browser - `index.html` |

Nothing runs on a server. The site is only files, which is why free static
hosting like GitHub Pages is enough.

---

## 2. What is in this folder

| File / folder | What it is | Upload to GitHub? |
| --- | --- | --- |
| `index.html` | the viewer page (all of its code is inside this one file) | yes |
| `tiles/` | the tile pyramid - **generated**, never edit by hand | yes |
| `tiles/breadclips.dzi` | standard Deep Zoom description of the image | yes |
| `tiles/breadclips_files/` | the tiles, one folder per level (`17` = full size) | yes |
| `tiles/manifest.js` | image size + version stamp read by `index.html` | yes |
| `vendor/openseadragon/` | OpenSeadragon 6.1.1, included so the site depends on no other website | yes |
| `make_tiles.py` | rebuilds `tiles/` from the master image | yes |
| `make_tiles.bat` | the same, as a double-click | yes |
| `preview.bat` | shows the site on your own computer | yes |
| `requirements.txt` | what `make_tiles.py` needs installed | yes |
| `.nojekyll` | tells GitHub Pages to publish the files exactly as they are | yes |
| `.gitignore` | tells Git which files to leave out | yes |
| `grid.png` | the master image | **no** - see below |

`grid.png` stays on your computer. GitHub refuses any file over 100 MB, and the
website does not use it - only the tiles made from it. `.gitignore` already
keeps it out, so you do not have to do anything.

---

## 3. Try it on your computer

Double-click **`preview.bat`**. A browser tab opens at `http://127.0.0.1:8000/`
showing the viewer exactly as it will look online. Close the black window when
you are finished.

(Opening `index.html` directly by double-clicking it may also work, but some
browsers restrict pages opened straight from disk, so `preview.bat` is the
reliable way.)

---

## 4. Put it on GitHub Pages

You only do this once. It needs a free GitHub account and the free
**GitHub Desktop** app (there are about 1,750 files, far too many to upload
through the GitHub website, which takes 100 at a time).

### Step by step

1. **Make an account** at <https://github.com> if you do not have one.
   Your username becomes part of the address, so pick one you are happy with.
2. **Install GitHub Desktop** from <https://desktop.github.com> and sign in.
3. In GitHub Desktop choose **File → Add local repository…**, pick this folder
   and click **Add repository**. It will say the folder is not a repository
   yet - click the blue **create a repository** link, leave every field as it
   is, and click **Create repository**.
4. Click **Publish repository** (top right).
   - **Name**: this becomes the end of the web address. `breadclips` is a good
     choice.
   - **Untick "Keep this code private"**. On a free account GitHub Pages only
     works for public repositories.
   - Click **Publish repository** and let the upload finish (about 90 MB).
5. On <https://github.com>, open the new repository, then
   **Settings → Pages** (left-hand menu).
   - **Source**: *Deploy from a branch*
   - **Branch**: `main`, folder `/ (root)` → **Save**
6. Wait a minute or two and refresh that page. It shows the address of your
   site:

   ```
   https://YOUR-USERNAME.github.io/breadclips/
   ```

   Open it. That is the viewer, live.

### If you prefer the command line

Install Git from <https://git-scm.com>, create an empty **public** repository
called `breadclips` on github.com, then run these in this folder:

```
git init -b main
git add .
git commit -m "Bread clip viewer"
git remote add origin https://github.com/YOUR-USERNAME/breadclips.git
git push -u origin main
```

Then do step 5 above.

---

## 5. Embed it in Wikidot

Edit the page on `diversityofbreadclips.wikidot.com` and paste this line where
the viewer should appear (replace `YOUR-USERNAME`, and `breadclips` if you
named the repository differently):

```
[[iframe https://YOUR-USERNAME.github.io/breadclips/ width="100%" height="800" frameborder="0" scrolling="no"]]
```

What each part does:

| Part | Meaning |
| --- | --- |
| `https://…github.io/breadclips/` | the address of the viewer |
| `width="100%"` | as wide as the page column |
| `height="800"` | 800 pixels tall - change to taste |
| `frameborder="0"` | no border line around it |
| `scrolling="no"` | no second scrollbar; the viewer does its own scrolling |

**A version that follows the size of the visitor's window.** Wikidot also
allows a `style`, which can use `vh` (percent of the window height). This one
is 85 % of the window tall, and falls back to 800 pixels if the style is ever
ignored:

```
[[iframe https://YOUR-USERNAME.github.io/breadclips/ width="100%" height="800" frameborder="0" scrolling="no" style="width:100%; height:85vh; border:0;"]]
```

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

## 6. Updating the image

When you have a new `grid.png` (more clips, a new layout, anything):

1. **Put the new `grid.png` in this folder**, replacing the old one.
   (Or leave it where it is and drag it onto `make_tiles.bat` in the next step.)
2. **Double-click `make_tiles.bat`.** It takes a few seconds and ends with
   something like:

   ```
   wrote  : 1747 tiles, 85.7 MB in tiles/  (largest tile 167 kB)
   version: 20261012-212418
   ```

   The first time ever, it installs pyvips by itself.
3. **Check it** with `preview.bat`.
4. **Publish it**: open GitHub Desktop. It lists the changed tiles on the left.
   Type a short note in the **Summary** box (for example `new scans, October`),
   click **Commit to main**, then **Push origin**.
5. After a minute or two the website and the Wikidot page show the new image.
   Nothing on Wikidot needs to change.

Things the script takes care of:

- **The image can change size.** More rows, a different width - the viewer
  reads the size from `tiles/manifest.js`, which is rewritten every time.
- **No stale tiles.** Every build gets a new version stamp that is added to
  each tile's address, so a visitor's browser can never mix old and new tiles.
- **Safe to interrupt.** The new tiles are built in a temporary `tiles.new`
  folder and only swapped in when complete. If something fails, the existing
  `tiles/` is untouched.

From a command prompt the same thing is:

```
python make_tiles.py                              (uses grid.png in this folder)
python make_tiles.py ..\claude\output\grid.png    (any other file)
python make_tiles.py --quality 95                 (see section 8)
```

---

## 7. Controls

| To do this | Mouse / keyboard | Trackpad | Touch screen |
| --- | --- | --- | --- |
| Scroll through the clips | mouse wheel, or drag | two-finger scroll | drag (flick to coast) |
| Zoom | **Ctrl + wheel**, `+` / `-`, the buttons, double-click | pinch | pinch, double-tap |
| Move sideways when zoomed in | drag, Shift + wheel, `←` `→` | two-finger scroll | drag |
| Jump a screen | `Page Down` / `Page Up`, `Space` / `Shift+Space` | | |
| Jump to the start / end | `Home` / `End` | | |
| Jump anywhere | click or drag in the strip on the right | same | tap the strip |
| Back to fit-to-width | `0`, or the ↔ button | | ↔ button |

The page always opens fitted to the width of the window, at the top. The strip
on the right is the **navigator**: a miniature of the whole collection with a
yellow box marking the part currently on screen.

---

## 8. Settings you can change

### Tile settings - top of `make_tiles.py`

| Setting | Default | What it does |
| --- | --- | --- |
| `QUALITY` | `92` | JPEG quality. Higher = larger files, see the table below |
| `FORMAT` | `"jpg"` | `jpg`, `webp` or `png` |
| `TILE_SIZE` | `512` | tile size in pixels. Smaller means many more files |
| `SOURCE` | `"grid.png"` | the master image used when you do not name one |
| `BACKGROUND` | `(0, 0, 0)` | colour that replaces transparency, if the master has any |

Sizes measured on the current image:

| Setting | Total size | Notes |
| --- | --- | --- |
| jpg, quality 85 | 63 MB | smallest jpg option |
| jpg, quality 90 | 78 MB | |
| **jpg, quality 92** | **86 MB** | **default** |
| jpg, quality 95 | 112 MB | costs more per update (section 9) |
| webp, quality 92 | 45 MB | half the size; takes about 25 s to build instead of 5 |
| png | not measured, expect 300 MB or more | truly lossless, but slow to load - not recommended |

How close is the default to the original? Comparing full-size tiles with the
same area of `grid.png`, pixel values differ by 0.7 on average on the 0-255
scale - well below what an eye can see. The tiles are also saved with full
colour detail (no "chroma subsampling"), which keeps the edges of coloured
clips crisp against the black background.

### Viewer settings - the `Settings` block near the top of the script in `index.html`

| Setting | Default | What it does |
| --- | --- | --- |
| `MAX_ZOOM` | `2` | how far in you can zoom. `2` = each scan pixel shown twice as large |
| `MIN_ZOOM` | `1` | how far out. `1` = fit to width; `0.5` would allow half that size |
| `WHEEL_SMOOTHING` | `90` | how softly a mouse-wheel step glides. `0` = instant, `150` = floaty |
| `ZOOM_STEP` | `1.5` | how much one press of `+` / `-` zooms |
| `ARROW_STEP` | `120` | pixels moved per arrow-key press |
| `PRELOAD_SCREENS` | `1` | how many screens ahead are downloaded early while scrolling. `0` = off |

The page title is the `<title>` line at the top of `index.html`. Colours and
the width of the right-hand strip are in the `:root { … }` block just below it.

---

## 9. Limits worth knowing

| GitHub limit | Value | Where this project stands |
| --- | --- | --- |
| Largest single file | 100 MB | biggest tile is under 0.2 MB. `grid.png` is over, which is why it is not uploaded |
| Published site size | 1 GB | about 86 MB |
| Traffic | 100 GB per month (soft) | scrolling through the whole collection at fit-to-width downloads about 20 MB in a normal window, about 53 MB on very large or high-density screens |
| Repository size | keep under about 1 GB | **grows with every update - read on** |

**The repository remembers every version.** Git keeps the old tiles each time
you publish new ones, so every update adds roughly the full tile size (about
86 MB) to the repository, even though the website itself stays at 86 MB.
After about ten updates it is worth starting fresh:

1. On github.com: repository → **Settings** → scroll to the bottom →
   **Delete this repository**.
2. In this folder, delete the hidden `.git` folder (turn on *View → Hidden
   items* in File Explorer to see it).
3. Repeat [section 4](#4-put-it-on-github-pages) using the **same name**. The
   address stays the same, so the Wikidot page keeps working.

Using `webp` tiles (section 8) halves how fast it grows.

---

## 10. Troubleshooting

**The page says "No tiles found".**
The `tiles/` folder is missing. Run `make_tiles.bat`.

**The website still shows the old image after an update.**
Give GitHub two or three minutes, then reload. In the repository on github.com
the **Actions** tab shows whether the "pages build and deployment" has
finished (green tick). Also check that you clicked **Push origin** in GitHub
Desktop, not only **Commit**.

**The GitHub address shows a 404 page.**
Pages is not switched on yet, or still building - see step 5 of section 4. The
repository must be public.

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
A big image got included. Only `grid.png` and `grid_labeled.png` are left out
automatically; add any other large file's name to `.gitignore`, or keep it
outside this folder.

**Scrolling zooms instead (or the other way round).**
Plain wheel = scroll, **Ctrl + wheel** = zoom. A pinch on a trackpad zooms.

---

### Credits

- [OpenSeadragon](https://openseadragon.github.io/) 6.1.1 - BSD 3-Clause
  licence, included in `vendor/openseadragon/`.
- [libvips](https://www.libvips.org/) via
  [pyvips](https://github.com/libvips/pyvips) - used to cut the tiles.
