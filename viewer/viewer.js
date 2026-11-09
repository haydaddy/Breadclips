// Shared viewer code for every page of the site.
//
// A page only needs <div id="viewer"></div> and, in this order:
//   tiles/manifest.js                    (written by make_tiles.py: which image, how big)
//   vendor/openseadragon/openseadragon.min.js
//   viewer/viewer.js                     (this file)
// The tiles are always read from the tiles/ folder next to the page.
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------
  const MAX_ZOOM = 2;          // furthest zoom in: screen pixels per scan pixel
  const WHEEL_SMOOTHING = 90;  // ms; how softly a mouse-wheel step glides (0 = instant)
  const ZOOM_STEP = 1.5;       // zoom factor of the + / - buttons and keys
  const ARROW_STEP = 120;      // pixels moved per arrow-key press
  const PRELOAD_SCREENS = 1;   // how many screens ahead of the scroll direction are fetched early
  const LONG_IMAGE = 3;        // images at least this many times taller than wide get a
                               // navigator strip in the rail, and cannot be zoomed out past
                               // fit-to-width; others have no navigator (zooming out until
                               // the whole image fits does that job without covering clips)

  const M = window.TILE_MANIFEST;
  const $ = (id) => document.getElementById(id);

  // --------------------------------------------------------------------------
  // Page furniture: the rail with the buttons, the navigator, messages.
  // --------------------------------------------------------------------------
  const ICONS = {
    'zoom-in':    '<path d="M12 5v14M5 12h14"/>',
    'zoom-out':   '<path d="M5 12h14"/>',
    'fit-width':  '<path d="M3 5v14M21 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    'fullscreen': '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    'open-tab':   '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  document.body.insertAdjacentHTML('beforeend',
    '<div id="rail">' +
      button('zoom-in', 'Zoom in (+)') +
      button('zoom-out', 'Zoom out (-)') +
      button('fit-width', 'Fit to width (0)') +
      button('fullscreen', 'Full screen', true) +
      '<a id="open-tab" target="_blank" rel="noopener" title="Open in a new tab" aria-label="Open in a new tab" hidden>' +
        '<svg viewBox="0 0 24 24">' + ICONS['open-tab'] + '</svg></a>' +
    '</div>' +
    '<div id="message">Loading…</div>' +
    '<div id="hint"></div>');

  function button(id, title, hidden) {
    return '<button id="' + id + '" type="button" title="' + title + '" aria-label="' + title.replace(/ \(.*\)$/, '') + '"' +
      (hidden ? ' hidden' : '') + '><svg viewBox="0 0 24 24">' + ICONS[id] + '</svg></button>';
  }

  const messageBox = $('message');
  function fail(text) {
    messageBox.textContent = text;
    messageBox.className = 'error';
    messageBox.hidden = false;
  }
  if (!window.OpenSeadragon) { fail('OpenSeadragon did not load (vendor/openseadragon/openseadragon.min.js).'); return; }
  if (!M) { fail('No tiles found. Run make_tiles.py to create the tiles/ folder.'); return; }

  const Point = OpenSeadragon.Point;
  const IMAGE_HEIGHT = M.height / M.width;   // viewport units: the image is 1 wide
  const IS_LONG = IMAGE_HEIGHT >= LONG_IMAGE;
  const MAX_LEVEL = Math.ceil(Math.log2(Math.max(M.width, M.height)));
  const TILES_URL = 'tiles/' + M.name + '_files/';
  const QUERY = '?v=' + M.version;           // new version = new URLs = no stale cached tiles

  // Long images: navigator strip filling the rest of the rail.
  if (IS_LONG) {
    $('rail').insertAdjacentHTML('beforeend',
      '<div id="navigator-slot"><div id="navigator" title="Click or drag to jump"></div></div>');
  }

  let embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }

  // --------------------------------------------------------------------------
  // Viewer
  // --------------------------------------------------------------------------
  const viewer = OpenSeadragon({
    element: $('viewer'),
    tileSources: {
      Image: {
        xmlns: 'http://schemas.microsoft.com/deepzoom/2008',
        Url: TILES_URL,
        Format: M.format,
        Overlap: M.overlap,
        TileSize: M.tileSize,
        Size: { Width: M.width, Height: M.height }
      },
      queryParams: QUERY
    },
    drawer: 'canvas',

    // our own buttons and keys
    showNavigationControl: false,
    keyboardNavEnabled: false,

    showNavigator: IS_LONG,
    navigatorId: IS_LONG ? 'navigator' : null,
    navigatorBackground: '#000',
    navigatorDisplayRegionColor: '#ffb300',

    // never show anything outside the image
    visibilityRatio: 1,
    constrainDuringPan: true,
    // long images stop at fit-to-width; others at "whole image fits"
    minZoomLevel: IS_LONG ? 1 : null,
    minZoomImageRatio: 1,
    maxZoomPixelRatio: MAX_ZOOM,

    // the wheel is handled below (scroll, not zoom)
    gestureSettingsMouse:   { scrollToZoom: false, clickToZoom: false, dblClickToZoom: true, dragToPan: true },
    gestureSettingsTouch:   { scrollToZoom: false, clickToZoom: false, dblClickToZoom: true, dragToPan: true, pinchToZoom: true, flickEnabled: true, pinchRotate: false },
    gestureSettingsPen:     { scrollToZoom: false, clickToZoom: false, dblClickToZoom: true, dragToPan: true },
    gestureSettingsUnknown: { scrollToZoom: false, clickToZoom: false, dblClickToZoom: true, dragToPan: true },

    animationTime: 0.5,
    blendTime: 0.1,
    maxTilesPerFrame: 4,
    tileRetryMax: 2,
    tileRetryDelay: 1500
  });
  let vp = null;               // viewer.viewport, once the image is open
  window.viewer = viewer;      // handy for poking around in the browser console

  viewer.addHandler('open', function () {
    vp = viewer.viewport;
    fitWidth(true, 0);         // start fitted to width, at the very top
    rememberView();
    showHint();
    setTimeout(function () { preload(1); }, 400);
  });
  viewer.addHandler('open-failed', function () {
    fail('The image tiles could not be loaded. Run make_tiles.py and reload.');
  });
  viewer.addOnceHandler('tile-loaded', function () { messageBox.hidden = true; });

  // When the viewer changes size (window resized, phone rotated) behave like a
  // web page: the same share of the width stays visible - so fit-to-width stays
  // fit-to-width - and the top edge of the view stays where it is.
  // (OpenSeadragon's own rule keeps the centre and rescales by the diagonal.)
  let anchor = null;           // zoom and top-left corner of the view as last seen
  let resized = false;
  function rememberView() {
    const b = vp.getBounds(true);
    anchor = { zoom: vp.getZoom(true), x: b.x, y: b.y };
  }
  viewer.addHandler('resize', function () { resized = true; });
  viewer.addHandler('viewport-change', function () {
    if (!vp) { return; }
    if (resized && anchor) {
      stopGlide();
      vp.zoomTo(anchor.zoom, null, true);
      const b = vp.getBounds(true);
      vp.panTo(clampCenter(anchor.x + b.width / 2, anchor.y + b.height / 2), true);
      vp.applyConstraints(true);
    }
    resized = false;
    rememberView();
  });

  // The navigator strip is sized by CSS; tell OpenSeadragon whenever that changes.
  if (IS_LONG) {
    new ResizeObserver(function () {
      if (viewer.navigator) { viewer.navigator.updateSize(); }
    }).observe($('navigator-slot'));
  }

  // --------------------------------------------------------------------------
  // Geometry helpers.  Viewport coordinates: x runs 0..1 across the image,
  // y runs 0..IMAGE_HEIGHT down it.
  // --------------------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  // Nearest allowed view centre: the view may not leave the image.
  function clampCenter(x, y) {
    const b = vp.getBounds(true);
    return new Point(
      b.width >= 1 ? 0.5 : clamp(x, b.width / 2, 1 - b.width / 2),
      b.height >= IMAGE_HEIGHT ? IMAGE_HEIGHT / 2 : clamp(y, b.height / 2, IMAGE_HEIGHT - b.height / 2)
    );
  }

  // Fit to width. `top` = where the top edge of the view should be; left out,
  // the part of the image in the middle of the screen stays where it is.
  // If the whole image fits at that size it is centred instead.
  function fitWidth(immediately, top) {
    stopGlide();
    const size = vp.getContainerSize();
    const height = size.y / size.x;
    if (height >= IMAGE_HEIGHT) {
      top = (IMAGE_HEIGHT - height) / 2;
    } else {
      if (top === undefined) { top = vp.getCenter(true).y - height / 2; }
      top = clamp(top, 0, IMAGE_HEIGHT - height);
    }
    vp.fitBounds(new OpenSeadragon.Rect(0, top, 1, height), immediately);
  }

  function zoomAt(factor, clientX, clientY, immediately) {
    stopGlide();
    let ref;
    if (clientX !== undefined) {
      const box = viewer.element.getBoundingClientRect();
      ref = vp.pointFromPixel(new Point(clientX - box.left, clientY - box.top), true);
    }
    vp.zoomBy(factor, ref, immediately);
    vp.applyConstraints(immediately);
  }

  // --------------------------------------------------------------------------
  // Scrolling.  Trackpads send a stream of tiny steps that already feel smooth,
  // so those are applied directly.  A mouse wheel sends big jumps, so those
  // glide to their target instead.
  // --------------------------------------------------------------------------
  const glide = { target: null, frame: 0, last: 0, set: null };

  function stopGlide() {
    if (glide.frame) { cancelAnimationFrame(glide.frame); }
    glide.target = null; glide.frame = 0; glide.set = null;
  }

  function glideStep(now) {
    glide.frame = 0;
    if (!glide.target) { return; }
    const current = vp.getCenter(true);
    if (glide.set && (current.x !== glide.set.x || current.y !== glide.set.y)) {
      stopGlide();             // something else (drag, zoom, navigator) moved the view
      return;
    }
    const target = clampCenter(glide.target.x, glide.target.y);
    const k = WHEEL_SMOOTHING > 0 ? 1 - Math.exp(-Math.min(now - glide.last, 50) / WHEEL_SMOOTHING) : 1;
    glide.last = now;
    const next = new Point(current.x + (target.x - current.x) * k, current.y + (target.y - current.y) * k);
    const left = vp.deltaPixelsFromPoints(target.minus(next), true);
    if (Math.abs(left.x) < 0.5 && Math.abs(left.y) < 0.5) {
      vp.panTo(target, true);
      stopGlide();
      return;
    }
    vp.panTo(next, true);
    glide.set = next;
    glide.frame = requestAnimationFrame(glideStep);
  }

  function glideTo(target) {
    glide.target = target;
    if (!glide.frame) {
      glide.last = performance.now();
      glide.frame = requestAnimationFrame(glideStep);
    }
  }

  // Move the view by screen pixels. Returns false when it is already at the
  // edge in that direction (nothing moved).
  function scrollBy(dx, dy, smooth) {
    const delta = vp.deltaPointsFromPixels(new Point(dx, dy), true);
    const from = glide.target || vp.getCenter(true);
    const to = clampCenter(from.x + delta.x, from.y + delta.y);
    const current = vp.getCenter(true);
    const gap = vp.deltaPixelsFromPoints(to.minus(current), true);
    if (Math.abs(gap.x) < 0.5 && Math.abs(gap.y) < 0.5) { return false; }
    if (smooth) {
      glideTo(to);
    } else {
      stopGlide();
      vp.panTo(to, true);
    }
    return true;
  }

  window.addEventListener('wheel', function (e) {
    if (!vp) { return; }
    e.stopPropagation();       // OpenSeadragon must not see the wheel at all
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? vp.getContainerSize().y * 0.9 : 1;
    let dx = e.deltaX * unit;
    let dy = e.deltaY * unit;
    const fine = e.deltaMode === 0 && Math.abs(e.deltaX) < 50 && Math.abs(e.deltaY) < 50;  // trackpad-like

    // Ctrl + wheel zooms. A trackpad pinch also arrives here: browsers report
    // it as a wheel event with ctrlKey set.
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(Math.exp(-dy * (fine ? 0.01 : 0.002)), e.clientX, e.clientY, fine);
      hideHint();
      return;
    }

    if (e.shiftKey && dx === 0) { dx = dy; dy = 0; }   // Shift + wheel = sideways
    const moved = scrollBy(dx, dy, !fine);
    // At the very top or bottom, let an embedding page take over the scroll.
    if (moved || !embedded) { e.preventDefault(); }
    if (moved) { hideHint(); }
  }, { passive: false, capture: true });

  // Safari on a Mac reports trackpad pinches as gesture events instead.
  if (!navigator.maxTouchPoints) {
    let lastScale = 1;
    window.addEventListener('gesturestart', function (e) { e.preventDefault(); lastScale = e.scale; });
    window.addEventListener('gesturechange', function (e) {
      e.preventDefault();
      if (vp && e.scale > 0) { zoomAt(e.scale / lastScale, e.clientX, e.clientY, true); lastScale = e.scale; }
    });
    window.addEventListener('gestureend', function (e) { e.preventDefault(); });
  }

  // --------------------------------------------------------------------------
  // Keyboard
  // --------------------------------------------------------------------------
  window.addEventListener('keydown', function (e) {
    if (!vp || e.ctrlKey || e.metaKey || e.altKey) { return; }
    const onControl = e.target instanceof Element && e.target.closest('button, a');
    if (onControl && (e.key === ' ' || e.key === 'Enter')) { return; }
    const page = vp.getContainerSize().y * 0.9;
    const center = glide.target || vp.getCenter(true);
    switch (e.key) {
      case 'ArrowDown':  scrollBy(0, ARROW_STEP, true); break;
      case 'ArrowUp':    scrollBy(0, -ARROW_STEP, true); break;
      case 'ArrowRight': scrollBy(ARROW_STEP, 0, true); break;
      case 'ArrowLeft':  scrollBy(-ARROW_STEP, 0, true); break;
      case 'PageDown':   scrollBy(0, page, true); break;
      case 'PageUp':     scrollBy(0, -page, true); break;
      case ' ':          scrollBy(0, e.shiftKey ? -page : page, true); break;
      case 'Home':       glideTo(clampCenter(center.x, 0)); break;
      case 'End':        glideTo(clampCenter(center.x, IMAGE_HEIGHT)); break;
      case '+': case '=': zoomAt(ZOOM_STEP); break;
      case '-': case '_': zoomAt(1 / ZOOM_STEP); break;
      case '0':          fitWidth(false); break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    hideHint();
  }, true);

  // --------------------------------------------------------------------------
  // Buttons
  // --------------------------------------------------------------------------
  $('zoom-in').addEventListener('click', function () { if (vp) { zoomAt(ZOOM_STEP); } });
  $('zoom-out').addEventListener('click', function () { if (vp) { zoomAt(1 / ZOOM_STEP); } });
  $('fit-width').addEventListener('click', function () { if (vp) { fitWidth(false); } });

  // Full screen needs permission from the embedding page, which Wikidot's
  // [[iframe]] cannot give - there the button opens the viewer in its own tab.
  if (document.fullscreenEnabled) {
    $('fullscreen').hidden = false;
    $('fullscreen').addEventListener('click', function () {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else { document.documentElement.requestFullscreen().catch(function () {}); }
    });
  } else if (embedded) {
    $('open-tab').href = window.location.href;
    $('open-tab').hidden = false;
  }

  // --------------------------------------------------------------------------
  // Preloading.  OpenSeadragon only loads what is on screen, so while scrolling
  // new rows would pop in a moment late.  Fetching the next screen in the
  // direction of travel puts those tiles in the browser cache ahead of time.
  // --------------------------------------------------------------------------
  const preloaded = new Map();   // url -> Image, oldest first
  let lastPreload = 0;
  let lastY = null;

  function preload(direction) {
    if (!vp || !PRELOAD_SCREENS || !direction) { return; }
    const image = viewer.world.getItemAt(0);
    if (!image) { return; }
    // The level OpenSeadragon draws at this zoom: the most detailed one whose
    // pixels are not shown smaller than minPixelRatio screen pixels.
    let level = MAX_LEVEL;
    while (level > 0 && vp.deltaPixelsFromPointsNoRotate(image.source.getPixelRatio(level), true).x < viewer.minPixelRatio) {
      level--;
    }
    const b = vp.getBounds(true);
    const shrink = Math.pow(2, level - MAX_LEVEL);                       // size of this level, 1 = full size
    const scale = shrink * M.width;                                      // level pixels per viewport unit
    const columns = Math.ceil(Math.ceil(M.width * shrink) / M.tileSize);
    const rows = Math.ceil(Math.ceil(M.height * shrink) / M.tileSize);
    const band = b.height * PRELOAD_SCREENS;
    const top = direction > 0 ? b.y + b.height : b.y - band;
    const x0 = clamp(Math.floor(b.x * scale / M.tileSize), 0, columns - 1);
    const x1 = clamp(Math.floor((b.x + b.width) * scale / M.tileSize), 0, columns - 1);
    const y0 = Math.floor(top * scale / M.tileSize);
    const y1 = Math.floor((top + band) * scale / M.tileSize);
    for (let y = Math.max(y0, 0); y <= Math.min(y1, rows - 1); y++) {
      for (let x = x0; x <= x1; x++) {
        const url = TILES_URL + level + '/' + x + '_' + y + '.' + M.format + QUERY;
        if (!preloaded.has(url)) {
          const img = new Image();
          img.decoding = 'async';
          img.src = url;
          preloaded.set(url, img);
        }
      }
    }
    while (preloaded.size > 300) { preloaded.delete(preloaded.keys().next().value); }
  }

  viewer.addHandler('viewport-change', function () {
    if (!vp) { return; }
    const y = vp.getCenter(true).y;
    const now = performance.now();
    if (lastY !== null && y !== lastY && now - lastPreload > 120) {
      lastPreload = now;
      preload(y > lastY ? 1 : -1);
    }
    lastY = y;
  });

  // --------------------------------------------------------------------------
  // Hint
  // --------------------------------------------------------------------------
  const hint = $('hint');
  let hintTimer = 0;
  function showHint() {
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    hint.textContent = touch
      ? 'Drag to scroll · pinch to zoom'
      : 'Scroll to browse · Ctrl + scroll or pinch to zoom · drag to move';
    hint.classList.add('show');
    hintTimer = setTimeout(hideHint, 7000);
  }
  function hideHint() {
    clearTimeout(hintTimer);
    hint.classList.remove('show');
  }
  viewer.addHandler('canvas-drag', hideHint);
  viewer.addHandler('canvas-pinch', hideHint);
}());
