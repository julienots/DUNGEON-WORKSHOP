import { h } from './dom.js';

/** Barre de progression. ratio dans [0,1]. */
export function ProgressBar(ratio, { label = '', color = 'gold', height = 14 } = {}) {
  const r = Math.max(0, Math.min(1, ratio || 0));
  return h(`div.progress.progress-${color}`, { style: { height: `${height}px` } },
    h('div.progress-fill', { style: { width: `${(r * 100).toFixed(1)}%` } }),
    label ? h('span.progress-label', label) : null,
  );
}
