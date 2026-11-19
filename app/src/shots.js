// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo loaded;
// ?shot=cover shows the cover alone. `photo` picks the sample (samples/<photo>.jpg), `caption`
// the words, and layout, grade, size, captionPos and captionStyle the cover's look.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load({
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'Vice City',
    layout: query.get('layout') ?? 'strip',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1920x1080',
    captionPos: query.get('captionPos') ?? 'bottom',
    captionStyle: query.get('captionStyle') ?? 'sunset',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
