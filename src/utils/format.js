export function formatQty(n) {
  const value = Number(n) || 0;
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

export function formatMoney(n, currency = '') {
  const value = Number(n) || 0;
  const amount = value.toFixed(2);
  return currency ? `${currency}${amount}` : amount;
}
