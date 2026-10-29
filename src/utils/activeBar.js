// The bar this app is working in. Sent as X-ZBS-Bar on every signed-in request, so this phone stays
// on its bar even if the same account switches bars on the website. Also scopes the offline caches
// that aren't already per sheet (the bar profile and the sheet list).
//
// A Verifier viewing a bar as support sends X-ZBS-View instead: read-only, on the server's say-so.
let current = 0;
let view = 0;

export function getActiveBar() {
  return current;
}

export function setActiveBar(id) {
  current = parseInt(id, 10) || 0;
}

export function getActiveView() {
  return view;
}

export function setActiveView(id) {
  view = parseInt(id, 10) || 0;
}

/** What the offline caches are keyed on: the bar, or the bar being viewed (kept apart, and cleared after). */
export function cacheScope() {
  return view ? `v${view}` : String(current);
}
