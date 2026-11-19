// Vice Poster — the cover renderer. Draws a GTA-style multi-panel poster onto a canvas:
// photo panels with a sunset or neon grade, white poster gutters, film grain, a vignette, and
// bold outlined caption lettering. Pure canvas 2D, no libraries, no network.

/** The four panel layouts, each a list of panel rects in fractions of the cover. */
export const LAYOUTS = {
  hero: [{ x: 0, y: 0, w: 1, h: 1 }],
  strip: [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 0.5 },
    { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
  ],
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  split: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ],
};

/** The colour grades, each a set of overlay stops drawn over the photos. */
export const GRADES = {
  sunset: 'sunset',
  neon: 'neon',
  noir: 'noir',
};

/** The export sizes: square, portrait and wide. */
export const SIZES = ['1080x1080', '1080x1350', '1920x1080'];

/** Panel rects for a layout, in canvas pixels. */
export function panelRects(layout, width, height) {
  return LAYOUTS[layout].map((r) => ({
    x: r.x * width,
    y: r.y * height,
    w: r.w * width,
    h: r.h * height,
  }));
}

/** A tiny seeded random generator, so the film grain is the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;

/** A 160 px tile of grey noise, built once and reused as a repeating pattern. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const rand = mulberry32(20261119);
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(rand() * 74);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return grainTile;
}

/** Draws one photo cover-fitted into a panel rect, with zoom and pan offsets. */
export function drawPhotoInRect(ctx, img, rect, zoom, panX, panY) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + panX * rect.w * 0.25;
  const cy = rect.y + rect.h / 2 + panY * rect.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** The grade wash drawn over a panel after its photo. */
export function drawGradeOverlay(ctx, rect, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (grade === 'sunset') {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 176, 92, 0.05)');
    wash.addColorStop(0.55, 'rgba(255, 110, 60, 0.10)');
    wash.addColorStop(1, 'rgba(190, 30, 130, 0.34)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (grade === 'neon') {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(0, 225, 255, 0.14)');
    wash.addColorStop(0.5, 'rgba(120, 60, 255, 0.08)');
    wash.addColorStop(1, 'rgba(255, 0, 180, 0.22)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = 'rgba(8, 8, 18, 0.30)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

/** A dark placeholder for a panel with no photo yet. */
export function drawEmptyPanel(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3a2350');
  g.addColorStop(1, '#160d24');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.03, rect.w * 0.02]);
  ctx.strokeRect(rect.x + rect.w * 0.08, rect.y + rect.h * 0.08, rect.w * 0.84, rect.h * 0.84);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `700 ${Math.max(14, rect.w * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Film grain over the whole cover, and a vignette darkening the corners. */
export function drawGrainAndVignette(ctx, width, height) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  const v = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.72,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
}

/** Splits the caption into at most two lines that fit the cover width. */
export function wrapCaption(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const next = `${line} ${word}`;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === 2) break;
    }
  }
  lines.push(line);
  if (lines.length > 2) return lines.slice(0, 2);
  return lines;
}

/** The bold outlined caption lettering, with a gradient fill and a rule bar. */
export function drawCaption(ctx, width, height, caption, pos, style, sizeScale) {
  const text = caption.trim().toUpperCase();
  if (!text) return;
  const maxWidth = width * 0.86;
  let size = height * 0.11 * sizeScale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = '0.04em'; } catch { /* older canvas: no letter spacing */ }
  };
  setFont(size);
  while (ctx.measureText(text).width > maxWidth * 2 && size > 16) {
    size -= 4;
    setFont(size);
  }
  const lines = wrapCaption(ctx, text, maxWidth);
  while (lines.length === 2 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > maxWidth && size > 16) {
    size -= 4;
    setFont(size);
  }
  const lineHeight = size * 1.05;
  const blockHeight = lines.length * lineHeight;
  const top = pos === 'top'
    ? height * 0.045
    : height - height * 0.055 - blockHeight;
  // A dark band behind the lettering so it reads over any photo.
  const band = ctx.createLinearGradient(0, top - size * 0.35, 0, top + blockHeight + size * 0.3);
  band.addColorStop(0, 'rgba(12, 4, 22, 0)');
  band.addColorStop(0.25, 'rgba(12, 4, 22, 0.55)');
  band.addColorStop(0.75, 'rgba(12, 4, 22, 0.55)');
  band.addColorStop(1, 'rgba(12, 4, 22, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, top - size * 0.35, width, blockHeight + size * 0.65);
  // A sunset rule bar above the lettering.
  const ruleY = pos === 'top' ? top + blockHeight + size * 0.22 : top - size * 0.28;
  const rule = ctx.createLinearGradient(width * 0.12, 0, width * 0.88, 0);
  rule.addColorStop(0, '#ffb347');
  rule.addColorStop(0.5, '#ff5e78');
  rule.addColorStop(1, '#b04dff');
  ctx.fillStyle = rule;
  ctx.fillRect(width * 0.12, ruleY, width * 0.76, Math.max(4, size * 0.05));
  // The lettering itself: thick dark outline, gradient fill, soft drop shadow.
  const fill = ctx.createLinearGradient(width * 0.08, 0, width * 0.92, 0);
  if (style === 'neon') {
    fill.addColorStop(0, '#8ef9ff');
    fill.addColorStop(0.5, '#e08bff');
    fill.addColorStop(1, '#ff5cf1');
  } else if (style === 'white') {
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffe9f4');
  } else {
    fill.addColorStop(0, '#ffe259');
    fill.addColorStop(0.5, '#ff7e5f');
    fill.addColorStop(1, '#ff2e88');
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = size * 0.18;
  ctx.fillStyle = fill;
  ctx.shadowColor = style === 'neon' ? 'rgba(255, 0, 200, 0.55)' : 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  lines.forEach((line, i) => {
    const y = top + size + i * lineHeight;
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole cover. `state` holds layout, caption, captionPos, captionStyle, grade and
 * captionSize; `panels` holds one entry per panel rect ({ photo, zoom, panX, panY }, photo an
 * index into `photos` or null); `photos` holds the loaded images (or null per slot).
 */
export function drawCover(canvas, state, panels, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const rects = panelRects(state.layout, w, h);
  const gutter = Math.max(4, Math.round(w * 0.008));
  ctx.fillStyle = '#0e0b16';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const panel = panels[i] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const inset = {
      x: rect.x + (rect.x > 0 ? gutter / 2 : 0),
      y: rect.y + (rect.y > 0 ? gutter / 2 : 0),
      w: rect.w - (rect.x > 0 ? gutter / 2 : 0) - (rect.x + rect.w < w ? gutter / 2 : 0),
      h: rect.h - (rect.y > 0 ? gutter / 2 : 0) - (rect.y + rect.h < h ? gutter / 2 : 0),
    };
    const img = panel.photo === null ? null : photos[panel.photo];
    if (img) {
      if (state.grade === 'noir') ctx.filter = 'grayscale(0.75) contrast(1.12)';
      drawPhotoInRect(ctx, img, inset, panel.zoom, panel.panX, panel.panY);
      ctx.filter = 'none';
      drawGradeOverlay(ctx, inset, state.grade);
    } else {
      drawEmptyPanel(ctx, inset);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.strokeRect(inset.x + ctx.lineWidth / 2, inset.y + ctx.lineWidth / 2, inset.w - ctx.lineWidth, inset.h - ctx.lineWidth);
  });
  drawGrainAndVignette(ctx, w, h);
  drawCaption(ctx, w, h, state.caption, state.captionPos, state.captionStyle, state.captionSize);
}
