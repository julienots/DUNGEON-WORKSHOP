const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 125400 -> "125 400" ; 3 450 000 -> "3,45M" */
export function formatNumber(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return '0';
  const neg = n < 0;
  n = Math.abs(n);
  let out;
  if (n < 1e6) {
    out = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else {
    let tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIXES.length) {
      out = n.toExponential(2);
    } else {
      const scaled = n / Math.pow(10, tier * 3);
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      out = scaled.toFixed(digits).replace('.', ',') + SUFFIXES[tier];
    }
  }
  return (neg ? '-' : '') + out;
}

/** Version compacte pour les petites zones (barres de ressources). */
export function formatShort(n) {
  if (Math.abs(n) < 10000) return formatNumber(n);
  const tier = Math.floor(Math.log10(Math.abs(n)) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(1);
  const scaled = n / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : 1;
  return scaled.toFixed(digits).replace('.', ',') + SUFFIXES[tier];
}

export function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function formatPercent(v, digits = 0) {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(digits)}%`;
}

export function plural(n, word, pluralWord = word + 's') {
  return `${formatNumber(n)} ${Math.abs(n) > 1 ? pluralWord : word}`;
}
