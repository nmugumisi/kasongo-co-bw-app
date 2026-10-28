// Mirrors the calc() function in zs-bar-stock/assets/zbs-app.js and class-zbs-sheet.php exactly.
export function r2(n) {
  return Math.round(n * 100) / 100;
}

export function calc(it) {
  const received = it.received;
  const available = it.open + received;
  const expected = available - it.pos;
  const counted = it.count !== null && it.count !== undefined;
  const variance = counted ? r2(it.count - expected) : 0;
  return {
    received,
    available,
    expected: r2(expected),
    counted,
    variance,
    closing: counted ? it.count : Math.max(0, r2(expected)),
    todo: !counted && available > 0,
    oversold: it.pos > available,
  };
}
