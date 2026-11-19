// Vice Poster — wires the page: load up to three photos, pick a layout, crop each panel,
// write the caption, choose a grade and a size, and export the cover as a PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, SIZES, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelName = document.getElementById('panelName');
const panelPhoto = document.getElementById('panelPhoto');
const panelZoom = document.getElementById('panelZoom');
const panelPanX = document.getElementById('panelPanX');
const panelPanY = document.getElementById('panelPanY');

/** The editor's state: everything the cover is drawn from. */
const state = {
  layout: 'strip',
  caption: 'Vice City',
  captionPos: 'bottom',
  captionStyle: 'sunset',
  captionSize: 1,
  grade: 'sunset',
  size: '1080x1080',
};

/** One crop entry per panel: which photo it shows, and its zoom and pan. */
let panels = [];
/** The loaded photos, one per slot, or null where a slot is empty. */
const photos = [null, null, null];
let selectedPanel = 0;

/** Resets the panel crops for the current layout: every panel shows photo 1. */
function resetPanels() {
  const count = LAYOUTS[state.layout].length;
  panels = Array.from({ length: count }, () => ({ photo: 0, zoom: 1, panX: 0, panY: 0 }));
  if (selectedPanel >= count) selectedPanel = 0;
}

/** Redraws the preview canvas from the state, panels and photos. */
function redraw() {
  drawCover(canvas, state, panels, photos);
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads a sample photo from app/samples/ into a slot and shows its thumbnail. */
export async function loadSamplePhoto(name, slot) {
  const img = await loadImage(`samples/${name}.jpg`);
  photos[slot] = img;
  const thumb = document.querySelector(`.slot[data-slot="${slot}"] .thumb`);
  if (thumb) {
    thumb.textContent = '';
    const preview = document.createElement('img');
    preview.src = `samples/${name}.jpg`;
    preview.alt = `${name} sample photo`;
    thumb.append(preview);
  }
  redraw();
}

/** Refreshes the panel editor (name, photo list, sliders) for the selected panel. */
function syncPanelEditor() {
  const count = panels.length;
  panelName.textContent = `${selectedPanel + 1} of ${count}`;
  const panel = panels[selectedPanel];
  panelPhoto.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Empty panel';
  panelPhoto.append(empty);
  photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Photo ${i + 1}${photo ? '' : ' (empty)'}`;
    panelPhoto.append(option);
  });
  panelPhoto.value = panel.photo === null ? '' : String(panel.photo);
  panelZoom.value = String(panel.zoom);
  panelPanX.value = String(panel.panX);
  panelPanY.value = String(panel.panY);
}

/** Marks one control group as active and the rest as idle. */
function markActive(group, value) {
  document.querySelectorAll(`[data-${group}]`).forEach((button) => {
    button.classList.toggle('active', button.dataset[group] === value);
  });
}

/** Applies a layout: new panel crops, a fresh panel editor, a redraw. */
function applyLayout(layout) {
  state.layout = layout;
  resetPanels();
  markActive('layout', layout);
  syncPanelEditor();
  redraw();
}

/** Applies a colour grade and redraws. */
function applyGrade(grade) {
  state.grade = grade;
  markActive('grade', grade);
  redraw();
}

/** Applies an export size: resizes the canvas backing store and redraws. */
function applySize(size) {
  state.size = size;
  const [w, h] = size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  markActive('size', size);
  redraw();
}

/** Exports the cover at the chosen size as a PNG download. */
export async function exportPNG() {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, panels, photos);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-poster-${w}x${h}.png`;
  a.click();
  status.textContent = `Saved vice-poster-${w}x${h}.png`;
  window.__lastExport = { url, width: w, height: h };
  return blob;
}

// Photo slots: pick a file from the machine, or try a sample photo.
document.querySelectorAll('.slot').forEach((slot) => {
  const index = Number(slot.dataset.slot);
  slot.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photos[index] = await loadImage(URL.createObjectURL(file));
    const thumb = slot.querySelector('.thumb');
    thumb.textContent = '';
    const preview = document.createElement('img');
    preview.src = URL.createObjectURL(file);
    preview.alt = file.name;
    thumb.append(preview);
    status.textContent = `Photo ${index + 1} loaded: ${file.name}`;
    redraw();
  });
  slot.querySelector('[data-clear]').addEventListener('click', () => {
    photos[index] = null;
    slot.querySelector('.thumb').textContent = 'Empty';
    slot.querySelector('input[type=file]').value = '';
    redraw();
  });
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const free = photos.findIndex((photo) => photo === null);
    const slot = free === -1 ? 0 : free;
    await loadSamplePhoto(button.dataset.sample, slot);
    status.textContent = `Sample photo loaded into photo ${slot + 1}`;
  });
});

document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => applyLayout(button.dataset.layout));
});
document.querySelectorAll('[data-grade]').forEach((button) => {
  button.addEventListener('click', () => applyGrade(button.dataset.grade));
});
document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => applySize(button.dataset.size));
});

panelPhoto.addEventListener('change', () => {
  panels[selectedPanel].photo = panelPhoto.value === '' ? null : Number(panelPhoto.value);
  redraw();
});
panelZoom.addEventListener('input', () => {
  panels[selectedPanel].zoom = Number(panelZoom.value);
  redraw();
});
panelPanX.addEventListener('input', () => {
  panels[selectedPanel].panX = Number(panelPanX.value);
  redraw();
});
panelPanY.addEventListener('input', () => {
  panels[selectedPanel].panY = Number(panelPanY.value);
  redraw();
});

const captionInput = document.getElementById('caption');
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
document.getElementById('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  redraw();
});
document.getElementById('captionStyle').addEventListener('change', (e) => {
  state.captionStyle = e.target.value;
  redraw();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  redraw();
});

document.getElementById('export').addEventListener('click', exportPNG);

// Clicking the preview selects the panel under the pointer.
canvas.addEventListener('click', (e) => {
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * canvas.width;
  const y = ((e.clientY - box.top) / box.height) * canvas.height;
  const hit = panelRects(state.layout, canvas.width, canvas.height)
    .findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  if (hit !== -1) {
    selectedPanel = hit;
    syncPanelEditor();
    status.textContent = `Panel ${hit + 1} selected — crop it on the left`;
  }
});

// A `?shot=` query sets up a fixed scene for a screenshot instead of the live editor.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (scene) => {
    applySize(scene.size);
    applyLayout(scene.layout);
    applyGrade(scene.grade);
    state.caption = scene.caption;
    captionInput.value = scene.caption;
    state.captionPos = scene.captionPos;
    state.captionStyle = scene.captionStyle;
    document.getElementById('captionPos').value = scene.captionPos;
    document.getElementById('captionStyle').value = scene.captionStyle;
    await loadSamplePhoto(scene.photo, 0);
    redraw();
  });
} else {
  resetPanels();
  markActive('layout', state.layout);
  markActive('grade', state.grade);
  markActive('size', state.size);
  syncPanelEditor();
  redraw();
}
