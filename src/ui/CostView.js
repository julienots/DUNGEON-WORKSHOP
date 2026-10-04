import { h } from './dom.js';
import { icon } from './icons.js';
import { ctx } from './context.js';
import { formatShort } from '../utils/format.js';

/** Affiche un coût ; chaque ressource manquante apparaît en rouge. */
export function CostView(cost, { compact = false, gain = false } = {}) {
  const wrap = h(`span.cost${compact ? '.cost-compact' : ''}`);
  const res = ctx.game?.state?.resources || {};
  for (const [k, v] of Object.entries(cost || {})) {
    if (!v) continue;
    const lacking = !gain && (res[k] || 0) < v;
    wrap.appendChild(h(`span.cost-item${lacking ? '.lacking' : ''}${gain ? '.gain' : ''}`, { html: `${icon(k)}<b>${gain ? '+' : ''}${formatShort(v)}</b>` }));
  }
  return wrap;
}
