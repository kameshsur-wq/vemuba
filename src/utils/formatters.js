export function fmt(n) {
  n = Number(n) || 0;
  n = Math.round(n * 1e8) / 1e8;
  const s = String(n);
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.slice(dot + 1).replace(/0+$/, '').length;
  const digits = Math.max(2, dp);
  return n.toLocaleString('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 2
  });
}

export function fmtUSD(n) {
  n = Number(n) || 0;
  n = Math.round(n * 1e8) / 1e8;
  const s = String(n);
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.slice(dot + 1).replace(/0+$/, '').length;
  const digits = Math.max(2, dp);
  return '$' + n.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 2
  });
}

export function fmtPlain(n) {
  n = Math.round(Number(n || 0) * 1e8) / 1e8;
  const s = String(n);
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.slice(dot + 1).replace(/0+$/, '').length;
  return dp <= 2 ? n.toFixed(2) : String(n);
}

export function fmtDate(d) {
  if (!d) return '—';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const day = parseInt(parts[2], 10);
  const mon = parseInt(parts[1], 10);
  const yr = parts[0];
  if (isNaN(day) || isNaN(mon) || mon < 1 || mon > 12) return d;
  return `${day} ${months[mon - 1]} ${yr}`;
}

export function fmtDateShort(d) {
  if (!d) return '—';
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = String(d).split('-');
  if (p.length !== 3) return d;
  const day = String(parseInt(p[2], 10)).padStart(2, '0');
  const monIdx = parseInt(p[1], 10) - 1;
  return `${day}-${mons[monIdx] || 'Jan'}-${p[0]}`;
}

export function uid(prefix = 'e') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
