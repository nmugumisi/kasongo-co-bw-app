// The bar this app is working in. Sent as X-ZBS-Bar on every signed-in request, so this phone stays
// on its bar even if the same account switches bars on the website. Also scopes the offline caches
// that aren't already per sheet (the bar profile and the sheet list).
let current = 0;

export function getActiveBar() {
  return current;
}

export function setActiveBar(id) {
  current = parseInt(id, 10) || 0;
}
